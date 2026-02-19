import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from './src/models/Event.js';

dotenv.config();

async function checkEvents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const totalCount = await Event.countDocuments();
    const activeCount = await Event.countDocuments({ status: 'active' });
    const pendingCount = await Event.countDocuments({ status: 'pending-approval' });
    
    console.log('\n📊 Event Statistics:');
    console.log('═'.repeat(40));
    console.log(`Total Events: ${totalCount}`);
    console.log(`Active Events: ${activeCount}`);
    console.log(`Pending Events: ${pendingCount}`);
    
    const types = await Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📋 Event Types:');
    types.forEach(t => console.log(`  ${t._id}: ${t.count}`));
    
    const events = await Event.find().select('name type status vectorId').limit(10);
    console.log('\n📅 Recent Events:');
    events.forEach(e => {
      console.log(`  • ${e.name} (${e.type}) - ${e.status} ${e.vectorId ? '✅' : '❌'}`);
    });
    
    const withEmbeddings = await Event.countDocuments({ vectorId: { $exists: true, $ne: null } });
    console.log(`\n🤖 Events with AI Embeddings: ${withEmbeddings}/${totalCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvents();
