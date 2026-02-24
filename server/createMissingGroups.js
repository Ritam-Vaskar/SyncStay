import mongoose from 'mongoose';
import Event from './src/models/Event.js';
import InventoryGroup from './src/models/InventoryGroup.js';
import connectDB from './src/config/database.js';

async function createMissingGroups() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected\n');

    // Get all events
    const events = await Event.find({});
    console.log(`📅 Found ${events.length} events\n`);

    for (const event of events) {
      console.log(`\n📍 Processing event: ${event.name}`);
      
      // Get all invited guests with groups
      const guestsWithGroups = event.invitedGuests.filter(g => g.group && g.group.trim() !== '');
      
      if (guestsWithGroups.length === 0) {
        console.log(`   No guests with groups`);
        continue;
      }

      // Get unique group names
      const groupNames = [...new Set(guestsWithGroups.map(g => g.group))];
      console.log(`   Groups in guest list: ${groupNames.join(', ')}`);

      // Check which groups exist in InventoryGroup
      const existingGroups = await InventoryGroup.find({
        event: event._id,
        name: { $in: groupNames }
      });

      const existingGroupNames = new Set(existingGroups.map(g => g.name));
      const missingGroups = groupNames.filter(name => !existingGroupNames.has(name));

      if (missingGroups.length === 0) {
        console.log(`   ✅ All groups already exist in inventory`);
        continue;
      }

      console.log(`   ⚠️  Missing groups: ${missingGroups.join(', ')}`);

      // Create missing groups
      for (const groupName of missingGroups) {
        const groupGuests = guestsWithGroups.filter(g => g.group === groupName);
        
        const newGroup = await InventoryGroup.create({
          event: event._id,
          name: groupName,
          description: `Auto-created from guest list: ${groupName}`,
          number: groupGuests.length,
          members: groupGuests.map(g => ({
            guestEmail: g.email,
            guestName: g.name,
            addedAt: g.addedAt || new Date()
          })),
          type: 'manual',
          priority: 1
        });

        console.log(`   ✅ Created group "${groupName}" with ${groupGuests.length} members`);
      }
    }

    console.log(`\n✨ Done!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createMissingGroups();
