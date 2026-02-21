import mongoose from 'mongoose';
import User from './src/models/User.js';

mongoose.connect('mongodb://localhost:27017/group-inventory')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check TBO hotels
    const tboHotels = await User.find({ role: 'hotel', hotelSource: 'tbo' }).limit(2).lean();
    console.log('\n=== TBO HOTELS ===');
    console.log('Total TBO hotels:', await User.countDocuments({ role: 'hotel', hotelSource: 'tbo' }));
    console.log('\nSample TBO hotel:');
    console.log(JSON.stringify(tboHotels[0], null, 2));
    
    // Check if vectorId exists
    console.log('\n=== VECTOR ID CHECK ===');
    console.log('Has vectorId:', tboHotels[0]?.vectorId ? 'YES' : 'NO');
    console.log('vectorId value:', tboHotels[0]?.vectorId);
    
    // Check location data
    console.log('\n=== LOCATION DATA ===');
    console.log('City:', tboHotels[0]?.location?.city);
    console.log('Country:', tboHotels[0]?.location?.country);
    console.log('Full location:', JSON.stringify(tboHotels[0]?.location, null, 2));
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
