import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserActivity from './src/models/UserActivity.js';

dotenv.config();

async function checkActivities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all activities
    const activities = await UserActivity.find({})
      .sort({ timestamp: -1 })
      .limit(10);

    console.log(`Total recent activities: ${activities.length}\n`);
    
    for (const activity of activities) {
      console.log(`Activity: ${activity.type}`);
      console.log(`  Entity ID: ${activity.entityId}`);
      console.log(`  Entity Type: ${activity.entityType}`);
      console.log(`  Timestamp: ${activity.timestamp}`);
      console.log(`  User ID: ${activity.userId}`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkActivities();
