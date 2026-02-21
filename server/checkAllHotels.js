import mongoose from 'mongoose';
import User from './src/models/User.js';

mongoose.connect('mongodb://localhost:27017/group-inventory')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check all hotels
    const totalHotels = await User.countDocuments({ role: 'hotel' });
    console.log('\n=== HOTEL COUNT ===');
    console.log('Total hotels (all sources):', totalHotels);
    
    // Check by source
    const seededCount = await User.countDocuments({ role: 'hotel', hotelSource: 'seeded' });
    const tboCount = await User.countDocuments({ role: 'hotel', hotelSource: 'tbo' });
    const noSourceCount = await User.countDocuments({ role: 'hotel', hotelSource: { $exists: false } });
    
    console.log('Seeded hotels:', seededCount);
    console.log('TBO hotels:', tboCount);
    console.log('Hotels without hotelSource:', noSourceCount);
    
    // Get sample hotel
    const sampleHotel = await User.findOne({ role: 'hotel' }).lean();
    if (sampleHotel) {
      console.log('\n=== SAMPLE HOTEL ===');
      console.log('Name:', sampleHotel.organizationName);
      console.log('Source:', sampleHotel.hotelSource);
      console.log('City:', sampleHotel.location?.city);
      console.log('Country:', sampleHotel.location?.country);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
