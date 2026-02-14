import mongoose from 'mongoose';
import Event from './src/models/Event.js';

const mongoURI = 'mongodb://localhost:27017/sync-stay';

async function resetHasAccessed() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Reset hasAccessed to false for all invited guests
    const result = await Event.updateMany(
      { 'invitedGuests.0': { $exists: true } },
      { $set: { 'invitedGuests.$[].hasAccessed': false } }
    );

    console.log(`✅ Reset hasAccessed for ${result.modifiedCount} event(s)`);

    // Show the events
    const events = await Event.find({
      'invitedGuests.0': { $exists: true }
    }).select('name invitedGuests.name invitedGuests.email invitedGuests.hasAccessed');

    console.log('\n📋 Private events with invited guests:');
    events.forEach(e => {
      console.log(`\n   Event: ${e.name}`);
      e.invitedGuests.forEach(g => {
        console.log(`      - ${g.name} (${g.email}): hasAccessed = ${g.hasAccessed}`);
      });
    });

    await mongoose.disconnect();
    console.log('\n✅ Done! All invited guests hasAccessed reset to false.');
    console.log('They will be marked as accessed when they make their first booking.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

resetHasAccessed();
