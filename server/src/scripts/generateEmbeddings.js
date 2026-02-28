import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { generateEventEmbedding, generateHotelEmbedding } from '../services/embeddingService.js';
import { upsertVector, batchUpsertVectors, COLLECTIONS } from '../config/qdrant.js';
import config from '../config/index.js';

dotenv.config();

/**
 * Generate embeddings for all existing events and hotels
 */
async function generateAllEmbeddings() {
  try {
    console.log('🚀 Starting embedding generation...\n');

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Generate Event Embeddings
    console.log('📅 Generating event embeddings...');
    const events = await Event.find({ status: { $in: ['active', 'rfp-published', 'approved'] } });
    console.log(`Found ${events.length} events to embed\n`);

    let eventSuccessCount = 0;
    let eventFailCount = 0;

    for (const event of events) {
      try {
        console.log(`Processing: ${event.name}...`);
        
        const { vector, hash } = await generateEventEmbedding(event);
        
        // Store in Qdrant
        await upsertVector(COLLECTIONS.EVENTS, event._id.toString(), vector, {
          name: event.name,
          type: event.type,
          location: event.location?.city || '',
          country: event.location?.country || '',
          budgetMin: event.budgetRange?.min || 0,
          budgetMax: event.budgetRange?.max || 0,
          attendees: event.expectedGuests || 0,
          status: event.status,
        });

        // Update Event model with vectorId and hash
        event.vectorId = event._id.toString();
        event.embeddingHash = hash;
        await event.save();

        eventSuccessCount++;
        console.log(`✅ Embedded: ${event.name}\n`);
      } catch (error) {
        eventFailCount++;
        console.error(`❌ Failed to embed event ${event.name}:`, error.message, '\n');
      }

      // Rate limiting - wait 100ms between calls
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Event Embedding Results:`);
    console.log(`   Success: ${eventSuccessCount}`);
    console.log(`   Failed: ${eventFailCount}\n`);

    // Generate Hotel Embeddings
    console.log('🏨 Generating hotel embeddings...');
    const hotels = await User.find({
      role: 'hotel',
      isActive: true,
      'location.city': { $exists: true },
    });
    console.log(`Found ${hotels.length} hotels to embed\n`);

    let hotelSuccessCount = 0;
    let hotelFailCount = 0;

    for (const hotel of hotels) {
      try {
        console.log(`Processing: ${hotel.organization}...`);
        
        const { vector, hash } = await generateHotelEmbedding(hotel);
        
        // Store in Qdrant
        await upsertVector(COLLECTIONS.HOTELS, hotel._id.toString(), vector, {
          name: hotel.organization,
          city: hotel.location?.city || '',
          country: hotel.location?.country || '',
          totalRooms: hotel.totalRooms || 0,
          specialization: hotel.specialization || [],
          priceMin: hotel.priceRange?.min || 0,
          priceMax: hotel.priceRange?.max || 0,
          rating: hotel.averageRating || 0,
        });

        // Update Hotel model with vectorId and hash
        hotel.vectorId = hotel._id.toString();
        hotel.embeddingHash = hash;
        await hotel.save();

        hotelSuccessCount++;
        console.log(`✅ Embedded: ${hotel.organization}\n`);
      } catch (error) {
        hotelFailCount++;
        console.error(`❌ Failed to embed hotel ${hotel.organization}:`, error.message, '\n');
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Hotel Embedding Results:`);
    console.log(`   Success: ${hotelSuccessCount}`);
    console.log(`   Failed: ${hotelFailCount}\n`);

    // Summary
    console.log('✅ Embedding generation completed!');
    console.log('\n📊 Final Summary:');
    console.log(`   Total Events: ${eventSuccessCount}/${events.length}`);
    console.log(`   Total Hotels: ${hotelSuccessCount}/${hotels.length}`);
    console.log(`   Total Vectors: ${eventSuccessCount + hotelSuccessCount}`);
    
    const totalCost = ((eventSuccessCount * 150 + hotelSuccessCount * 200) / 1000000) * 0.02;
    console.log(`   Estimated Cost: $${totalCost.toFixed(4)} USD`);
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Start server: npm run dev');
    console.log('   2. Test recommendations: GET /api/recommendations/user/:userId');
    console.log('   3. Monitor activity tracking\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
generateAllEmbeddings();
