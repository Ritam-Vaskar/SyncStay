import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from './src/models/Event.js';
import InventoryGroup from './src/models/InventoryGroup.js';
import User from './src/models/User.js';
import { rankHotelsForEvent } from './src/services/groupHotelRecommendationService.js';

dotenv.config();

async function testEmbeddingBonuses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syncstay');
    console.log('✅ Connected to MongoDB\n');

    // Find an event with selected hotels
    const event = await Event.findOne({
      selectedHotels: { $exists: true, $ne: [] },
    }).populate('selectedHotels.hotel');

    if (!event) {
      console.log('❌ No event with selected hotels found');
      console.log('\n📋 Creating test event with hotels...');
      
      // Get some hotels to use
      const hotels = await User.find({ role: 'hotel' }).limit(3);
      if (hotels.length < 2) {
        console.log('❌ Not enough hotels in database');
        await mongoose.disconnect();
        return;
      }

      // Create a test event
      const testEvent = await Event.create({
        name: 'Tech Conference 2026',
        type: 'conference',
        description: 'Annual tech conference for industry leaders',
        location: {
          city: 'Mumbai',
          country: 'India',
        },
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-17'),
        isPrivate: false,
        selectedHotels: hotels.slice(0, 3).map(h => ({
          hotel: h._id,
          notes: `Added ${h.name}`,
        })),
        status: 'active',
      });

      console.log(`✅ Created test event: ${testEvent.name}`);
      event = testEvent;
    }

    console.log(`📍 Event: ${event.name}`);
    console.log(`   Type: ${event.type}`);
    console.log(`   Location: ${event.location?.city}, ${event.location?.country}`);
    console.log(`   Private: ${event.isPrivate}`);
    console.log(`   Selected Hotels: ${event.selectedHotels?.length || 0}\n`);

    // Get or create groups for the event
    let groups = await InventoryGroup.find({ event: event._id });
    
    if (groups.length === 0) {
      console.log('📋 Creating test groups...');
      
      // Create test groups
      const testGroups = await InventoryGroup.insertMany([
        {
          event: event._id,
          name: 'Friends Group',
          description: 'Group of friends attending the conference',
          number: 8,
          members: [
            { guestName: 'Alice Johnson', guestEmail: 'alice@example.com' },
            { guestName: 'Bob Smith', guestEmail: 'bob@example.com' },
          ],
        },
        {
          event: event._id,
          name: 'VIP Group',
          description: 'VIP attendees',
          number: 4,
          members: [
            { guestName: 'Carol White', guestEmail: 'carol@example.com' },
            { guestName: 'David Brown', guestEmail: 'david@example.com' },
          ],
        },
      ]);
      
      groups = testGroups;
      console.log(`✅ Created ${groups.length} test groups\n`);
    }

    console.log(`📊 Groups: ${groups.length}`);
    groups.forEach(g => {
      console.log(`   - ${g.name} (${g.number} people)`);
    });
    console.log('');

    // Run the ranking with embedding bonuses
    console.log('🚀 Running rankHotelsForEvent...\n');
    console.log('═'.repeat(80));
    
    const recommendations = await rankHotelsForEvent(event._id.toString());

    console.log('═'.repeat(80));
    console.log('\n📊 RECOMMENDATION RESULTS:\n');

    if (recommendations.groupRecommendations.length > 0) {
      console.log('GROUP RECOMMENDATIONS:');
      console.log('─'.repeat(80));
      
      for (const groupRec of recommendations.groupRecommendations) {
        console.log(`\n${groupRec.groupName} (${groupRec.eventType} event)`);
        console.log('─'.repeat(40));
        
        for (let i = 0; i < groupRec.hotels.length; i++) {
          const hotel = groupRec.hotels[i];
          console.log(`\n  ${i + 1}. ${hotel.hotelName}`);
          console.log(`     Rule-Based Score:    ${hotel.ruleBasedScore.toFixed(1)}/100`);
          console.log(`     Embedding Bonus:     ${hotel.embeddingScore.toFixed(1)}/30`);
          console.log(`     Combined Score:      ${hotel.groupScore.toFixed(1)}/130 ⭐️`);
          console.log(`     Reasons:`);
          hotel.reasons.forEach(reason => {
            console.log(`       • ${reason}`);
          });
        }
      }
    }

    if (Object.keys(recommendations.individualRecommendations).length > 0) {
      console.log('\n\nINDIVIDUAL RECOMMENDATIONS:');
      console.log('─'.repeat(80));
      
      for (const [email, indvRec] of Object.entries(recommendations.individualRecommendations)) {
        console.log(`\n${indvRec.guestName} (${email})`);
        console.log(`Group: ${indvRec.groupName}`);
        console.log('─'.repeat(40));
        
        for (let i = 0; i < indvRec.hotels.length; i++) {
          const hotel = indvRec.hotels[i];
          console.log(`\n  ${i + 1}. ${hotel.hotelName}`);
          console.log(`     Rule-Based Score:    ${hotel.ruleBasedScore.toFixed(1)}/100`);
          console.log(`     Embedding Bonus:     ${hotel.embeddingScore.toFixed(1)}/30`);
          console.log(`     Personal Score:      ${hotel.personalScore.toFixed(1)}/130 ⭐️`);
          console.log(`     Reasons:`);
          hotel.reasons.forEach(reason => {
            console.log(`       • ${reason}`);
          });
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testEmbeddingBonuses();
