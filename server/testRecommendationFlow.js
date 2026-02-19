import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import UserActivity from './src/models/UserActivity.js';
import Event from './src/models/Event.js';
import { retrieveVector, COLLECTIONS } from './src/config/qdrant.js';

dotenv.config();

async function testRecommendationFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test user
    const user = await User.findOne({ role: 'guest' });
    if (!user) {
      console.log('❌ No guest user found');
      return;
    }

    console.log(`🧪 Testing recommendation flow for user: ${user.email}`);
    console.log(`User ID: ${user._id}\n`);

    // Check if user has a vector (before activities)
    console.log('📊 STEP 1: Checking user vector before activities...');
    const vectorBefore = await retrieveVector(COLLECTIONS.USERS, user._id.toString());
    if (vectorBefore && vectorBefore.vector) {
      console.log(`✅ User HAS a vector (length: ${vectorBefore.vector.length})`);
      console.log(`   Payload: ${JSON.stringify(vectorBefore.payload)}`);
    } else {
      console.log('❌ User has NO vector (cold start expected)');
    }

    // Check user's activities
    console.log('\n📊 STEP 2: Checking user activities...');
    const activities = await UserActivity.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .populate('entityId', 'name type status');

    console.log(`Total activities: ${activities.length}`);
    
    if (activities.length > 0) {
      console.log('\nRecent activities:');
      activities.slice(0, 5).forEach((activity, i) => {
        console.log(`  ${i + 1}. ${activity.type.toUpperCase()} - ${activity.entityId?.name || 'Unknown'} (${new Date(activity.timestamp).toLocaleString()})`);
      });

      // Check if those events have embeddings
      console.log('\n📊 STEP 3: Checking if activity events have embeddings...');
      let embeddedCount = 0;
      for (const activity of activities.slice(0, 5)) {
        if (activity.entityId) {
          const eventVector = await retrieveVector(COLLECTIONS.EVENTS, activity.entityId._id.toString());
          if (eventVector && eventVector.vector) {
            embeddedCount++;
            console.log(`  ✅ ${activity.entityId.name} has embedding`);
          } else {
            console.log(`  ❌ ${activity.entityId.name} NO embedding`);
          }
        }
      }
      console.log(`\nEvents with embeddings: ${embeddedCount}/${Math.min(activities.length, 5)}`);
    } else {
      console.log('❌ No activities found for this user');
    }

    // Check active events with embeddings
    console.log('\n📊 STEP 4: Checking active events with embeddings...');
    const activeEvents = await Event.find({ status: 'active' });
    console.log(`Total active events: ${activeEvents.length}`);
    
    let activeWithEmbeddings = 0;
    for (const event of activeEvents) {
      const eventVector = await retrieveVector(COLLECTIONS.EVENTS, event._id.toString());
      if (eventVector && eventVector.vector) {
        activeWithEmbeddings++;
        console.log(`  ✅ ${event.name} (${event.type})`);
      }
    }
    console.log(`\nActive events with embeddings: ${activeWithEmbeddings}/${activeEvents.length}`);

    // Final recommendation
    console.log('\n📊 STEP 5: Recommendation Status');
    if (vectorBefore && vectorBefore.vector && activeWithEmbeddings > 0) {
      console.log('✅ Should get PERSONALIZED recommendations');
      console.log(`   - User has vector: YES`);
      console.log(`   - Active events with embeddings: ${activeWithEmbeddings}`);
      console.log(`   - User activity count: ${activities.length}`);
    } else if (!vectorBefore || !vectorBefore.vector) {
      console.log('⚠️  Should get COLD START (trending) recommendations');
      console.log(`   - User has vector: NO`);
      if (activities.length > 0) {
        console.log(`   - User has ${activities.length} activities but vector not created yet`);
        console.log('   - This might indicate vector generation failed');
        console.log('   - Check server logs for "Error updating user vector" messages');
      }
    } else {
      console.log('⚠️  Might get COLD START due to no active events with embeddings');
      console.log(`   - User has vector: YES`);
      console.log(`   - Active events with embeddings: ${activeWithEmbeddings}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testRecommendationFlow();
