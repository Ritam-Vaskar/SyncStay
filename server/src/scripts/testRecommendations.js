import mongoose from 'mongoose';
import Event from '../models/Event.js';
import { generateHotelRecommendations } from '../services/hotelRecommendationService.js';

async function testRecommendations() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/group-inventory');
    console.log('✅ Connected to MongoDB');
    
    // Find the Tech Fest event
    const event = await Event.findOne({ name: 'Tech Fest' });
    
    if (!event) {
      console.error('❌ Event not found!');
      process.exit(1);
    }
    
    console.log('\n📋 Testing recommendations for event:', event.name);
    console.log('   Location:', event.location);
    console.log('   Expected guests:', event.expectedGuests);
    console.log('   Budget:', event.budget);
    console.log('   Budget per guest:', event.budget / event.expectedGuests);
    
    // Generate recommendations
    console.log('\n🔍 Generating recommendations...');
    const recommendations = await generateHotelRecommendations(event._id.toString());
    
    console.log('\n✅ Generated', recommendations.length, 'recommendations:');
    recommendations.forEach((rec, i) => {
      console.log(`\n${i + 1}. Hotel ID: ${rec.hotel}`);
      console.log(`   Score: ${rec.score}`);
      console.log(`   Reasons: ${rec.reasons.join(', ')}`);
    });
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testRecommendations();
