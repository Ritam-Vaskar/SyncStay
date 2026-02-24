import mongoose from 'mongoose';
import Event from './src/models/Event.js';
import InventoryGroup from './src/models/InventoryGroup.js';

// Use hardcoded connection or read from .env manually
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/syncstay';

async function testGroupCreation() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Find an event
    const event = await Event.findOne().sort({ createdAt: -1 });
    if (!event) {
      console.log('❌ No event found');
      process.exit(1);
    }

    console.log(`\n📅 Testing with event: ${event.name} (${event._id})`);

    // Check existing groups
    const existingGroups = await InventoryGroup.find({ event: event._id });
    console.log(`\n📊 Existing groups: ${existingGroups.length}`);
    existingGroups.forEach(g => {
      console.log(`  - ${g.name} (${g.members.length} members, size: ${g.number})`);
    });

    // Test creating a new group
    const testGroupName = 'TestGroup_' + Date.now();
    console.log(`\n🧪 Creating test group: ${testGroupName}`);

    const newGroup = await InventoryGroup.create({
      event: event._id,
      name: testGroupName,
      description: 'Test group creation',
      number: 5,
      members: [
        {
          guestEmail: 'test@example.com',
          guestName: 'Test User',
          addedAt: new Date()
        }
      ],
      type: 'manual',
      priority: 1
    });

    console.log(`✅ Group created successfully: ${newGroup._id}`);
    console.log(`   Name: ${newGroup.name}`);
    console.log(`   Members: ${newGroup.members.length}`);

    // Verify it can be fetched
    const fetchedGroups = await InventoryGroup.find({ event: event._id });
    console.log(`\n📊 Total groups now: ${fetchedGroups.length}`);

    // Clean up test group
    await InventoryGroup.findByIdAndDelete(newGroup._id);
    console.log(`\n🧹 Cleaned up test group`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGroupCreation();
