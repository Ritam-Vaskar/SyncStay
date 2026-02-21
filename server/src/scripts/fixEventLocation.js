import mongoose from 'mongoose';

const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

async function fixEventLocation() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/group-inventory');
    console.log('✅ Connected to MongoDB');
    
    console.log('🔧 Fixing event location data...');
    
    // Update the event
    const result = await Event.updateOne(
      { name: 'Tech Fest' },
      {
        $set: {
          'location.country': 'India',
          'location.city': 'Kolkata',
          budget: 8000000 // 4000 per guest for 2000 guests
        }
      }
    );
    
    console.log('✅ Update result:', result);
    
    // Verify the update
    const event = await Event.findOne({ name: 'Tech Fest' }).lean();
    console.log('\n📋 Updated event:');
    console.log('   Location:', event.location);
    console.log('   Budget:', event.budget);
    console.log('   Budget per guest:', event.budget / event.expectedGuests);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixEventLocation();
