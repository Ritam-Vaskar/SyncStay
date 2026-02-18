import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Inventory from '../models/Inventory.js';
import Booking from '../models/Booking.js';
import config from '../config/index.js';

dotenv.config();

const seedPrivateEventFlow = async () => {
  try {
    console.log('🌱 Starting PRIVATE EVENT FLOW seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Clear relevant collections
    console.log('🗑️  Clearing existing test data...');
    
    // Find test events first
    const testEvents = await Event.find({ name: /Private Wedding|Birthday Party/i });
    const testEventIds = testEvents.map(e => e._id);
    
    // Delete only bookings related to test events
    await Booking.deleteMany({ event: { $in: testEventIds } });
    
    // Delete test events
    await Event.deleteMany({ name: /Private Wedding|Birthday Party/i });
    
    // Delete test users
    await User.deleteMany({ email: /^(guest|wedding)/i });
    
    console.log('✅ Cleared test data\n');

    // Get existing users
    const admin = await User.findOne({ role: 'admin' });
    const planner = await User.findOne({ role: 'planner' });
    const hotel1 = await User.findOne({ email: 'hotel1@example.com' });
    const hotel2 = await User.findOne({ email: 'hotel2@example.com' });

    if (!admin || !planner || !hotel1 || !hotel2) {
      console.error('❌ Required users not found. Please run the main seeder first.');
      process.exit(1);
    }

    // Create guest users
    console.log('👥 Creating guest users...');
    const guestUsers = await User.create([
      {
        name: 'Emily Johnson',
        email: 'guest1@example.com',
        password: 'password123',
        role: 'guest',
        phone: '+1-555-1001',
        isActive: true,
        isVerified: true,
      },
      {
        name: 'Michael Chen',
        email: 'guest2@example.com',
        password: 'password123',
        role: 'guest',
        phone: '+1-555-1002',
        isActive: true,
        isVerified: true,
      },
      {
        name: 'Sarah Williams',
        email: 'guest3@example.com',
        password: 'password123',
        role: 'guest',
        phone: '+1-555-1003',
        isActive: true,
        isVerified: true,
      },
      {
        name: 'David Brown',
        email: 'guest4@example.com',
        password: 'password123',
        role: 'guest',
        phone: '+1-555-1004',
        isActive: true,
        isVerified: true,
      },
    ]);
    console.log(`✅ Created ${guestUsers.length} guest users\n`);

    // Create PRIVATE wedding event with invited guests
    console.log('💒 Creating PRIVATE wedding event...');
    const privateWedding = await Event.create({
      name: 'Anderson Private Wedding',
      type: 'wedding',
      description: 'Intimate wedding celebration for close family and friends. By invitation only.',
      planner: planner._id,
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-07-18'),
      location: {
        city: 'Napa Valley',
        country: 'USA',
        venue: 'Meadowood Resort',
      },
      expectedGuests: 50,
      bookingDeadline: new Date('2026-06-15'),
      status: 'active',
      approvedBy: admin._id,
      approvedAt: new Date(),
      isPrivate: true, // ⭐ PRIVATE EVENT
      invitedGuests: [
        // Guests with user accounts
        {
          name: 'Emily Johnson',
          email: 'guest1@example.com',
          phone: '+1-555-1001',
          hasAccessed: true,
          addedAt: new Date(),
        },
        {
          name: 'Michael Chen',
          email: 'guest2@example.com',
          phone: '+1-555-1002',
          hasAccessed: true,
          addedAt: new Date(),
        },
        {
          name: 'Sarah Williams',
          email: 'guest3@example.com',
          phone: '+1-555-1003',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'David Brown',
          email: 'guest4@example.com',
          phone: '+1-555-1004',
          hasAccessed: false,
          addedAt: new Date(),
        },
        // Additional invited guests (no accounts yet)
        {
          name: 'Jennifer Taylor',
          email: 'wedding.guest1@example.com',
          phone: '+1-555-2001',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'Robert Martinez',
          email: 'wedding.guest2@example.com',
          phone: '+1-555-2002',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'Lisa Anderson',
          email: 'wedding.guest3@example.com',
          phone: '+1-555-2003',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'James Wilson',
          email: 'wedding.guest4@example.com',
          phone: '+1-555-2004',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'Mary Davis',
          email: 'wedding.guest5@example.com',
          phone: '+1-555-2005',
          hasAccessed: false,
          addedAt: new Date(),
        },
        {
          name: 'Christopher Moore',
          email: 'wedding.guest6@example.com',
          phone: '+1-555-2006',
          hasAccessed: false,
          addedAt: new Date(),
        },
      ],
      totalGuestCost: 0, // Will be updated as bookings are created
      plannerPaidAmount: 0,
      micrositeConfig: {
        isPublished: true,
        customSlug: 'anderson-wedding-2026',
        theme: {
          primaryColor: '#f43f5e',
          logo: 'https://via.placeholder.com/150',
          bannerImage: 'https://via.placeholder.com/1200x400',
        },
      },
      accommodationNeeds: {
        totalRooms: 25,
        roomTypes: {
          single: 5,
          double: 15,
          suite: 5,
        },
        amenitiesRequired: ['Free WiFi', 'Breakfast Included', 'Spa Services'],
      },
      budget: 50000,
    });
    console.log(`✅ Created private wedding: ${privateWedding.name}`);
    console.log(`   Microsite URL: /microsite/${privateWedding.micrositeConfig.customSlug}`);
    console.log(`   Invited Guests: ${privateWedding.invitedGuests.length}\n`);

    // Create PUBLIC birthday party for comparison
    console.log('🎉 Creating PUBLIC birthday party event...');
    const publicBirthday = await Event.create({
      name: '50th Birthday Celebration',
      type: 'other',
      description: 'Join us for an amazing 50th birthday bash! Open to all friends and family.',
      planner: planner._id,
      startDate: new Date('2026-09-10'),
      endDate: new Date('2026-09-12'),
      location: {
        city: 'Miami',
        country: 'USA',
        venue: 'Fontainebleau Hotel',
      },
      expectedGuests: 100,
      bookingDeadline: new Date('2026-08-10'),
      status: 'active',
      approvedBy: admin._id,
      approvedAt: new Date(),
      isPrivate: false, // ⭐ PUBLIC EVENT
      invitedGuests: [], // No guest list for public events
      micrositeConfig: {
        isPublished: true,
        customSlug: 'birthday-bash-2026',
        theme: {
          primaryColor: '#8b5cf6',
          logo: 'https://via.placeholder.com/150',
          bannerImage: 'https://via.placeholder.com/1200x400',
        },
      },
    });
    console.log(`✅ Created public birthday party: ${publicBirthday.name}`);
    console.log(`   Microsite URL: /microsite/${publicBirthday.micrositeConfig.customSlug}`);
    console.log(`   Public Access: Anyone can book\n`);

    // Create inventory for PRIVATE wedding
    console.log('🏨 Creating inventory for private wedding...');
    const privateWeddingInventory = await Inventory.create([
      {
        event: privateWedding._id,
        hotel: hotel1._id,
        hotelName: 'Grand Royale Hotel',
        roomType: 'Deluxe Suite',
        totalRooms: 10,
        availableRooms: 7, // 3 already booked
        pricePerNight: 350,
        checkInDate: new Date('2026-07-15'),
        checkOutDate: new Date('2026-07-18'),
        inclusions: ['Breakfast', 'WiFi', 'Spa Access', 'Wedding Venue Access'],
        cancellationPolicy: 'Free cancellation up to 7 days before check-in',
        status: 'available',
        currency: 'USD',
      },
      {
        event: privateWedding._id,
        hotel: hotel1._id,
        hotelName: 'Grand Royale Hotel',
        roomType: 'Standard Double',
        totalRooms: 15,
        availableRooms: 14, // 1 already booked
        pricePerNight: 200,
        checkInDate: new Date('2026-07-15'),
        checkOutDate: new Date('2026-07-18'),
        inclusions: ['Breakfast', 'WiFi', 'Wedding Venue Access'],
        cancellationPolicy: 'Free cancellation up to 7 days before check-in',
        status: 'available',
        currency: 'USD',
      },
      {
        event: privateWedding._id,
        hotel: hotel2._id,
        hotelName: 'Ocean View Resort',
        roomType: 'Ocean View Suite',
        totalRooms: 8,
        availableRooms: 8,
        pricePerNight: 400,
        checkInDate: new Date('2026-07-15'),
        checkOutDate: new Date('2026-07-18'),
        inclusions: ['Breakfast', 'WiFi', 'Spa Access', 'Beach Access', 'Wedding Venue Access'],
        cancellationPolicy: 'Free cancellation up to 7 days before check-in',
        status: 'available',
        currency: 'USD',
      },
    ]);
    console.log(`✅ Created ${privateWeddingInventory.length} inventory items for private wedding\n`);

    // Create inventory for PUBLIC birthday party
    console.log('🏨 Creating inventory for public birthday party...');
    const publicBirthdayInventory = await Inventory.create([
      {
        event: publicBirthday._id,
        hotel: hotel1._id,
        hotelName: 'Grand Royale Hotel',
        roomType: 'Party Suite',
        totalRooms: 20,
        availableRooms: 20,
        pricePerNight: 250,
        checkInDate: new Date('2026-09-10'),
        checkOutDate: new Date('2026-09-12'),
        inclusions: ['Breakfast', 'WiFi', 'Party Access'],
        cancellationPolicy: 'Free cancellation up to 3 days before check-in',
        status: 'available',
        currency: 'USD',
      },
    ]);
    console.log(`✅ Created ${publicBirthdayInventory.length} inventory items for public birthday\n`);

    // Create bookings for PRIVATE wedding (paid by planner)
    console.log('📖 Creating bookings for private wedding (Planner Pays)...');
    
    const booking1 = await Booking.create({
      event: privateWedding._id,
      inventory: privateWeddingInventory[0]._id, // Deluxe Suite
      guest: guestUsers[0]._id, // Emily Johnson
      guestDetails: {
        name: guestUsers[0].name,
        email: guestUsers[0].email,
        phone: guestUsers[0].phone,
      },
      roomDetails: {
        hotelName: 'Grand Royale Hotel',
        roomType: 'Deluxe Suite',
        numberOfRooms: 2,
        checkIn: new Date('2026-07-15'),
        checkOut: new Date('2026-07-18'),
        numberOfNights: 3,
      },
      pricing: {
        pricePerNight: 350,
        totalNights: 3,
        subtotal: 2100, // 2 rooms * 350 * 3 nights
        tax: 210, // 10%
        discount: 0,
        totalAmount: 2310,
        currency: 'USD',
      },
      status: 'confirmed',
      paymentStatus: 'unpaid', // Planner will pay
      isPaidByPlanner: true, // ⭐ KEY FIELD
      specialRequests: 'Near elevator, quiet floor',
      confirmationCode: `CONF${Date.now()}${Math.floor(Math.random() * 10000)}`,
    });

    const booking2 = await Booking.create({
      event: privateWedding._id,
      inventory: privateWeddingInventory[1]._id, // Standard Double
      guest: guestUsers[1]._id, // Michael Chen
      guestDetails: {
        name: guestUsers[1].name,
        email: guestUsers[1].email,
        phone: guestUsers[1].phone,
      },
      roomDetails: {
        hotelName: 'Grand Royale Hotel',
        roomType: 'Standard Double',
        numberOfRooms: 1,
        checkIn: new Date('2026-07-15'),
        checkOut: new Date('2026-07-18'),
        numberOfNights: 3,
      },
      pricing: {
        pricePerNight: 200,
        totalNights: 3,
        subtotal: 600, // 1 room * 200 * 3 nights
        tax: 60, // 10%
        discount: 0,
        totalAmount: 660,
        currency: 'USD',
      },
      status: 'confirmed',
      paymentStatus: 'unpaid', // Planner will pay
      isPaidByPlanner: true, // ⭐ KEY FIELD
      confirmationCode: `CONF${Date.now()}${Math.floor(Math.random() * 10000)}`,
    });

    const booking3 = await Booking.create({
      event: privateWedding._id,
      inventory: privateWeddingInventory[0]._id, // Deluxe Suite
      guest: guestUsers[2]._id, // Sarah Williams
      guestDetails: {
        name: guestUsers[2].name,
        email: guestUsers[2].email,
        phone: guestUsers[2].phone,
      },
      roomDetails: {
        hotelName: 'Grand Royale Hotel',
        roomType: 'Deluxe Suite',
        numberOfRooms: 1,
        checkIn: new Date('2026-07-15'),
        checkOut: new Date('2026-07-18'),
        numberOfNights: 3,
      },
      pricing: {
        pricePerNight: 350,
        totalNights: 3,
        subtotal: 1050, // 1 room * 350 * 3 nights
        tax: 105, // 10%
        discount: 0,
        totalAmount: 1155,
        currency: 'USD',
      },
      status: 'pending',
      paymentStatus: 'unpaid', // Planner will pay
      isPaidByPlanner: true, // ⭐ KEY FIELD
      specialRequests: 'King bed preferred',
    });

    console.log(`✅ Created 3 bookings for private wedding`);
    console.log(`   Booking 1: Emily Johnson - 2 Deluxe Suites ($2,310)`);
    console.log(`   Booking 2: Michael Chen - 1 Standard Double ($660)`);
    console.log(`   Booking 3: Sarah Williams - 1 Deluxe Suite ($1,155) [Pending]`);
    
    // Update event total cost
    const totalCost = 2310 + 660 + 1155;
    privateWedding.totalGuestCost = totalCost;
    privateWedding.totalBookings = 3;
    await privateWedding.save();
    
    console.log(`\n   💰 Total Cost for Planner: $${totalCost.toLocaleString()}`);
    console.log(`   💵 Planner Paid: $0`);
    console.log(`   📊 Remaining Balance: $${totalCost.toLocaleString()}\n`);

    // Create a regular booking for PUBLIC event (guest pays)
    console.log('📖 Creating booking for public birthday (Guest Pays)...');
    const publicBooking = await Booking.create({
      event: publicBirthday._id,
      inventory: publicBirthdayInventory[0]._id,
      guest: guestUsers[3]._id, // David Brown
      guestDetails: {
        name: guestUsers[3].name,
        email: guestUsers[3].email,
        phone: guestUsers[3].phone,
      },
      roomDetails: {
        hotelName: 'Grand Royale Hotel',
        roomType: 'Party Suite',
        numberOfRooms: 1,
        checkIn: new Date('2026-09-10'),
        checkOut: new Date('2026-09-12'),
        numberOfNights: 2,
      },
      pricing: {
        pricePerNight: 250,
        totalNights: 2,
        subtotal: 500,
        tax: 50,
        discount: 0,
        totalAmount: 550,
        currency: 'USD',
      },
      status: 'confirmed',
      paymentStatus: 'paid', // Guest already paid
      isPaidByPlanner: false, // ⭐ Guest pays
      confirmationCode: `CONF${Date.now()}${Math.floor(Math.random() * 10000)}`,
    });
    console.log(`✅ Created 1 booking for public birthday`);
    console.log(`   David Brown - 1 Party Suite ($550) - Guest Paid\n`);

    // Print summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    📋 SEED SUMMARY                     ');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('👥 USERS CREATED:');
    console.log('   Admin: admin@example.com / password123');
    console.log('   Planner: planner@example.com / password123');
    console.log('   Hotel 1: hotel1@example.com / password123');
    console.log('   Hotel 2: hotel2@example.com / password123');
    console.log('   Guest 1: guest1@example.com / password123 ✓ Invited');
    console.log('   Guest 2: guest2@example.com / password123 ✓ Invited');
    console.log('   Guest 3: guest3@example.com / password123 ✓ Invited');
    console.log('   Guest 4: guest4@example.com / password123\n');

    console.log('🔒 PRIVATE EVENT (Planner Pays):');
    console.log(`   Name: ${privateWedding.name}`);
    console.log(`   URL: http://localhost:5173/microsite/${privateWedding.micrositeConfig.customSlug}`);
    console.log(`   Invited Guests: ${privateWedding.invitedGuests.length}`);
    console.log(`   Bookings: 3 (2 confirmed, 1 pending)`);
    console.log(`   Total Cost: $${totalCost.toLocaleString()}`);
    console.log('   Access: Requires email verification from invite list\n');

    console.log('🌐 PUBLIC EVENT (Guest Pays):');
    console.log(`   Name: ${publicBirthday.name}`);
    console.log(`   URL: http://localhost:5173/microsite/${publicBirthday.micrositeConfig.customSlug}`);
    console.log(`   Bookings: 1`);
    console.log('   Access: Open to everyone\n');

    console.log('🧪 TEST SCENARIOS:');
    console.log('\n1. TEST PRIVATE EVENT ACCESS:');
    console.log('   → Login as guest1@example.com');
    console.log('   → Visit: /microsite/anderson-wedding-2026');
    console.log('   → Should grant access (invited guest)');
    console.log('   → Try guest4@example.com (not invited) - should deny');

    console.log('\n2. TEST GUEST LIST MANAGEMENT:');
    console.log('   → Login as planner@example.com');
    console.log('   → Go to: Planner Events');
    console.log(`   → Click "Manage Guests" on "${privateWedding.name}"`);
    console.log('   → Add/remove guests, upload Excel, toggle privacy');

    console.log('\n3. TEST PLANNER BILLING:');
    console.log('   → Login as planner@example.com');
    console.log('   → Navigate to planner dashboard');
    console.log('   → View aggregated billing for private event');
    console.log(`   → Should show $${totalCost.toLocaleString()} total cost`);

    console.log('\n4. TEST BOOKING FLOW (PRIVATE):');
    console.log('   → Login as guest2@example.com (invited)');
    console.log('   → Visit private event microsite');
    console.log('   → Make booking - NO payment required');
    console.log('   → Should show "Paid by Planner" message');

    console.log('\n5. TEST BOOKING FLOW (PUBLIC):');
    console.log('   → Any user can visit public event');
    console.log('   → Make booking - payment REQUIRED');
    console.log('   → Normal payment flow applies');

    console.log('\n6. EXCEL UPLOAD TEST:');
    console.log('   → Create CSV with columns: Name, Email, Phone');
    console.log('   → Upload via Manage Guests page');
    console.log('   → Verify guests added to invite list\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedPrivateEventFlow();
