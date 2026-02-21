import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import tboService from '../services/tboService.js';
import tboTransformService from '../services/tboTransformService.js';

/**
 * Sync TBO Hotels Script
 * Fetches hotels from TBO API and saves them to the database
 */

// City configurations
const CITIES = [
  { name: 'Kolkata', code: '113128', limit: 12 },
  { name: 'Hyderabad', code: '113457', limit: 12 },
  { name: 'Bangalore', code: '130995', limit: 12 },
  { name: 'Mumbai', code: '113196', limit: 12 },
  // Skip Delhi for now if API is slow/timing out
  // { name: 'Delhi', code: '130443', limit: 12 },
];

async function syncTBOHotels() {
  console.log('🚀 Starting TBO Hotel Sync...\n');

  try {
    // Connect to MongoDB Atlas
    await connectDB();
    console.log('✅ Connected to database\n');

    let totalSynced = 0;

    for (const city of CITIES) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 Processing City: ${city.name} (Code: ${city.code})`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Fetch hotels from TBO API
        const tboHotels = await tboService.getHotelsForCity(city.code, city.limit);

        if (!tboHotels || tboHotels.length === 0) {
          console.warn(`⚠️ No hotels found for ${city.name}`);
          continue;
        }

        console.log(`✅ Fetched ${tboHotels.length} hotels from TBO`);

        // Transform hotels to our schema
        const transformedHotels = await tboTransformService.transformBatch(
          tboHotels,
          city.name
        );

        console.log(`✅ Transformed ${transformedHotels.length} hotels\n`);

        // Save to database
        const savedHotels = await tboTransformService.saveHotelsToDatabase(
          transformedHotels
        );

        console.log(`\n✅ Saved ${savedHotels.length} hotels for ${city.name}`);
        totalSynced += savedHotels.length;

        // Log sample hotel
        if (savedHotels.length > 0) {
          const sample = savedHotels[0];
          console.log('\n📝 Sample Hotel:');
          console.log(`   Name: ${sample.name}`);
          console.log(`   Code: ${sample.tboData.hotelCode}`);
          console.log(`   City: ${sample.location.city}`);
          console.log(`   Rating: ${sample.averageRating}⭐`);
          console.log(`   Rooms: ${sample.totalRooms}`);
          console.log(`   Price Range: ₹${sample.priceRange.min} - ₹${sample.priceRange.max}`);
          console.log(`   Facilities: ${sample.facilities.join(', ')}`);
        }

      } catch (cityError) {
        console.error(`❌ Error processing ${city.name}:`, cityError.message);
        continue;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Sync Complete! Total Hotels Synced: ${totalSynced}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal Error during sync:', error);
    throw error;
  }
}

// Run the sync
syncTBOHotels()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    mongoose.connection.close();
    process.exit(1);
  });
