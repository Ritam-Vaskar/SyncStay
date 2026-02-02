import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Inventory from '../models/Inventory.js';
import Proposal from '../models/Proposal.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import config from '../config/index.js';

dotenv.config();

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    organization: 'Platform Admin',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Sarah Johnson',
    email: 'planner@example.com',
    password: 'password123',
    role: 'planner',
    organization: 'Elite Events Co.',
    phone: '+1-555-0101',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Grand Royale Hotel',
    email: 'hotel1@example.com',
    password: 'password123',
    role: 'hotel',
    organization: 'Grand Royale Hotel',
    phone: '+1-555-0201',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Ocean View Resort',
    email: 'hotel2@example.com',
    password: 'password123',
    role: 'hotel',
    organization: 'Ocean View Resort',
    phone: '+1-555-0202',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'John Doe',
    email: 'guest1@example.com',
    password: 'password123',
    role: 'guest',
    phone: '+1-555-0301',
    isActive: true,
    isVerified: true,
  },
  {
    name: 'Jane Smith',
    email: 'guest2@example.com',
    password: 'password123',
    role: 'guest',
    phone: '+1-555-0302',
    isActive: true,
    isVerified: true,
  },
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Event.deleteMany({});
    await Inventory.deleteMany({});
    await Proposal.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.create(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    const admin = createdUsers.find((u) => u.role === 'admin');
    const planner = createdUsers.find((u) => u.role === 'planner');
    const hotel1 = createdUsers.find((u) => u.email === 'hotel1@example.com');
    const hotel2 = createdUsers.find((u) => u.email === 'hotel2@example.com');
    const guest1 = createdUsers.find((u) => u.email === 'guest1@example.com');
    const guest2 = createdUsers.find((u) => u.email === 'guest2@example.com');

    // Create events
    console.log('📅 Creating events...');
    const events = [
      {
        name: 'Global Tech Summit 2026',
        type: 'conference',
        description: 'Annual technology conference bringing together industry leaders and innovators.',
        planner: planner._id,
        startDate: new Date('2026-06-15'),
        endDate: new Date('2026-06-18'),
        location: {
          city: 'San Francisco',
          country: 'USA',
          venue: 'Moscone Center',
        },
        expectedGuests: 500,
        bookingDeadline: new Date('2026-05-15'),
        status: 'active',
        approvedBy: admin._id,
        approvedAt: new Date(),
        pricingTiers: [
          {
            name: 'VIP',
            description: 'Premium access with exclusive perks',
            basePrice: 500,
            discount: 50,
          },
          {
            name: 'Standard',
            description: 'Regular conference access',
            basePrice: 300,
            discount: 0,
          },
        ],
        guestEligibilityRules: {
          requireApproval: false,
          maxGuestsPerBooking: 3,
        },
        micrositeConfig: {
          isPublished: true,
          customSlug: 'tech-summit-2026',
          theme: {
            primaryColor: '#2563eb',
            logo: 'https://via.placeholder.com/150',
            bannerImage: 'https://via.placeholder.com/1200x400',
          },
        },
      },
      {
        name: 'Smith-Williams Wedding',
        type: 'wedding',
        description: 'Destination wedding celebration in beautiful Maui.',
        planner: planner._id,
        startDate: new Date('2026-08-20'),
        endDate: new Date('2026-08-23'),
        location: {
          city: 'Maui',
          country: 'USA',
          venue: 'Wailea Beach Resort',
        },
        expectedGuests: 150,
        bookingDeadline: new Date('2026-07-10'),
        status: 'active',
        approvedBy: admin._id,
        approvedAt: new Date(),
        pricingTiers: [
          {
            name: 'Family Suite',
            description: 'Spacious suite for families',
            basePrice: 400,
            discount: 100,
          },
          {
            name: 'Deluxe Room',
            description: 'Comfortable deluxe accommodation',
            basePrice: 250,
            discount: 50,
          },
        ],
        guestEligibilityRules: {
          requireApproval: true,
          maxGuestsPerBooking: 4,
        },
        micrositeConfig: {
          isPublished: true,
          customSlug: 'smith-williams-wedding',
          theme: {
            primaryColor: '#ec4899',
            logo: 'https://via.placeholder.com/150',
            bannerImage: 'https://via.placeholder.com/1200x400',
          },
        },
      },
      {
        name: 'Annual Sales Conference 2026',
        type: 'corporate',
        description: 'Company-wide sales conference with team building activities.',
        planner: planner._id,
        startDate: new Date('2026-09-10'),
        endDate: new Date('2026-09-12'),
        location: {
          city: 'Chicago',
          country: 'USA',
          venue: 'Hyatt Regency',
        },
        expectedGuests: 200,
        bookingDeadline: new Date('2026-08-10'),
        status: 'pending-approval',
        pricingTiers: [],
        guestEligibilityRules: {
          requireApproval: false,
          maxGuestsPerBooking: 2,
        },
        micrositeConfig: {
          isPublished: false,
          customSlug: 'sales-conference-2026',
          theme: {
            primaryColor: '#10b981',
          },
        },
      },
    ];

    const createdEvents = await Event.create(events);
    console.log(`✅ Created ${createdEvents.length} events`);

    const techSummit = createdEvents[0];
    const wedding = createdEvents[1];

    // Create inventory
    console.log('🏨 Creating inventory...');
    const inventory = [
      {
        event: techSummit._id,
        hotel: hotel1._id,
        hotelName: 'Grand Royale Hotel',
        roomType: 'Deluxe King Room',
        totalRooms: 50,
        availableRooms: 35,
        pricePerNight: 250,
        currency: 'USD',
        checkInDate: new Date('2026-06-14'),
        checkOutDate: new Date('2026-06-19'),
        inclusions: ['Breakfast', 'WiFi', 'Gym Access', 'Airport Transfer'],
        status: 'locked',
        releaseRules: {
          autoRelease: true,
          releaseDate: new Date('2026-05-01'),
        },
      },
      {
        event: techSummit._id,
        hotel: hotel2._id,
        hotelName: 'Ocean View Resort',
        roomType: 'Executive Suite',
        totalRooms: 30,
        availableRooms: 20,
        pricePerNight: 400,
        currency: 'USD',
        checkInDate: new Date('2026-06-14'),
        checkOutDate: new Date('2026-06-19'),
        inclusions: ['Breakfast', 'WiFi', 'Spa Access', 'Concierge Service'],
        status: 'locked',
        releaseRules: {
          autoRelease: false,
        },
      },
      {
        event: wedding._id,
        hotel: hotel1._id,
        hotelName: 'Grand Royale Hotel',
        roomType: 'Ocean View Suite',
        totalRooms: 40,
        availableRooms: 38,
        pricePerNight: 350,
        currency: 'USD',
        checkInDate: new Date('2026-08-19'),
        checkOutDate: new Date('2026-08-24'),
        inclusions: ['All Meals', 'WiFi', 'Beach Access', 'Welcome Cocktail'],
        status: 'locked',
      },
    ];

    const createdInventory = await Inventory.create(inventory);
    console.log(`✅ Created ${createdInventory.length} inventory items`);

    // Create proposals
    console.log('📄 Creating proposals...');
    const proposals = [
      {
        event: techSummit._id,
        hotel: hotel1._id,
        rfpDetails: {
          requestedRooms: 50,
          requestedDates: {
            checkIn: new Date('2026-06-14'),
            checkOut: new Date('2026-06-19'),
          },
          specialRequests: 'Conference room access needed',
        },
        proposalDetails: {
          hotelName: 'Grand Royale Hotel',
          roomTypes: [
            {
              type: 'Deluxe King Room',
              count: 50,
              pricePerNight: 250,
              inclusions: ['Breakfast', 'WiFi', 'Gym Access'],
            },
          ],
          totalCost: 62500,
          validUntil: new Date('2026-04-01'),
          terms: '50% deposit required, Free cancellation 30 days before',
          cancellationPolicy: 'Full refund if cancelled 30+ days before check-in',
        },
        status: 'accepted',
        submittedAt: new Date('2026-01-15'),
        reviewedAt: new Date('2026-01-20'),
        reviewNotes: 'Excellent proposal, competitive pricing',
      },
      {
        event: wedding._id,
        hotel: hotel2._id,
        rfpDetails: {
          requestedRooms: 40,
          requestedDates: {
            checkIn: new Date('2026-08-19'),
            checkOut: new Date('2026-08-24'),
          },
          specialRequests: 'Wedding venue and decoration services',
        },
        proposalDetails: {
          hotelName: 'Ocean View Resort',
          roomTypes: [
            {
              type: 'Ocean View Suite',
              count: 40,
              pricePerNight: 380,
              inclusions: ['All Meals', 'WiFi', 'Beach Access', 'Wedding Package'],
            },
          ],
          totalCost: 76000,
          validUntil: new Date('2026-06-01'),
          terms: '30% deposit required, Wedding venue included',
          cancellationPolicy: 'Partial refund if cancelled 60+ days before',
        },
        status: 'under-review',
        submittedAt: new Date('2026-02-01'),
      },
    ];

    const createdProposals = await Proposal.create(proposals);
    console.log(`✅ Created ${createdProposals.length} proposals`);

    // Create bookings
    console.log('📝 Creating bookings...');
    const bookings = [
      {
        event: techSummit._id,
        inventory: createdInventory[0]._id,
        guest: guest1._id,
        guestDetails: {
          name: guest1.name,
          email: guest1.email,
          phone: guest1.phone,
        },
        roomDetails: {
          hotelName: 'Grand Royale Hotel',
          roomType: 'Deluxe King Room',
          numberOfRooms: 2,
          checkIn: new Date('2026-06-14'),
          checkOut: new Date('2026-06-19'),
          numberOfNights: 5,
        },
        pricing: {
          pricePerNight: 250,
          totalNights: 5,
          subtotal: 2500,
          tax: 250,
          discount: 0,
          totalAmount: 2750,
          currency: 'USD',
        },
        status: 'confirmed',
        paymentStatus: 'paid',
        specialRequests: 'Non-smoking room preferred',
      },
      {
        event: techSummit._id,
        inventory: createdInventory[1]._id,
        guest: guest2._id,
        guestDetails: {
          name: guest2.name,
          email: guest2.email,
          phone: guest2.phone,
        },
        roomDetails: {
          hotelName: 'Ocean View Resort',
          roomType: 'Executive Suite',
          numberOfRooms: 1,
          checkIn: new Date('2026-06-14'),
          checkOut: new Date('2026-06-19'),
          numberOfNights: 5,
        },
        pricing: {
          pricePerNight: 400,
          totalNights: 5,
          subtotal: 2000,
          tax: 200,
          discount: 100,
          totalAmount: 2100,
          currency: 'USD',
        },
        status: 'confirmed',
        paymentStatus: 'partial',
        specialRequests: 'Late check-in expected',
      },
    ];

    const createdBookings = await Booking.create(bookings);
    console.log(`✅ Created ${createdBookings.length} bookings`);

    // Create payments
    console.log('💳 Creating payments...');
    const payments = [
      {
        booking: createdBookings[0]._id,
        event: techSummit._id,
        payer: guest1._id,
        amount: 2750,
        currency: 'USD',
        paymentMethod: 'card',
        paymentType: 'full',
        status: 'completed',
        completedAt: new Date('2026-03-01'),
        gatewayResponse: {
          mock: true,
          transactionId: 'mock_txn_12345',
        },
      },
      {
        booking: createdBookings[1]._id,
        event: techSummit._id,
        payer: guest2._id,
        amount: 1050,
        currency: 'USD',
        paymentMethod: 'card',
        paymentType: 'partial',
        status: 'completed',
        completedAt: new Date('2026-03-05'),
        gatewayResponse: {
          mock: true,
          transactionId: 'mock_txn_12346',
        },
      },
    ];

    const createdPayments = await Payment.create(payments);
    console.log(`✅ Created ${createdPayments.length} payments`);

    // Update event stats
    techSummit.totalBookings = 2;
    techSummit.totalRevenue = 3800;
    await techSummit.save();

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Events: ${createdEvents.length}`);
    console.log(`   Inventory: ${createdInventory.length}`);
    console.log(`   Proposals: ${createdProposals.length}`);
    console.log(`   Bookings: ${createdBookings.length}`);
    console.log(`   Payments: ${createdPayments.length}`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: admin@example.com / password123');
    console.log('   Planner: planner@example.com / password123');
    console.log('   Hotel 1: hotel1@example.com / password123');
    console.log('   Hotel 2: hotel2@example.com / password123');
    console.log('   Guest 1: guest1@example.com / password123');
    console.log('   Guest 2: guest2@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
