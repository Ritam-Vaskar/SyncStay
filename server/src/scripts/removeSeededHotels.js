import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import User from '../models/User.js';

/**
 * Remove Seeded Hotels Script
 * Removes all pre-seeded hotels from the database
 */

async function removeSeededHotels() {
  console.log('🗑️  Starting Seeded Hotels Removal...\n');

  try {
    // Connect to MongoDB Atlas
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find all seeded hotels
    const seededHotels = await User.find({
      role: 'hotel',
      hotelSource: { $in: ['seeded', 'manual', null] },
    });

    console.log(`Found ${seededHotels.length} seeded/manual hotels\n`);

    if (seededHotels.length === 0) {
      console.log('✅ No seeded hotels to remove');
      return;
    }

    // Log hotels to be removed
    console.log('Hotels to be removed:');
    seededHotels.forEach((hotel, index) => {
      console.log(`${index + 1}. ${hotel.name} (${hotel.location?.city || 'Unknown'})`);
    });

    // Delete seeded hotels
    const result = await User.deleteMany({
      role: 'hotel',
      hotelSource: { $in: ['seeded', 'manual', null] },
    });

    console.log(`\n✅ Removed ${result.deletedCount} seeded hotels`);

  } catch (error) {
    console.error('❌ Error removing seeded hotels:', error);
    throw error;
  }
}

// Run the removal
removeSeededHotels()
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
