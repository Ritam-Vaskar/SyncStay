import Booking from '../models/Booking.js';
import Inventory from '../models/Inventory.js';
import HotelProposal from '../models/HotelProposal.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';
import sendEmail from '../utils/mail.js';
import { bookingReceivedTemplate, bookingConfirmedTemplate, plannerNewBookingTemplate } from '../utils/emailTemplates.js';

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (filtered by role)
 * @access  Private
 */
export const getBookings = asyncHandler(async (req, res) => {
  const { event, status, paymentStatus } = req.query;
  let query = {};

  // Role-based filtering
  if (req.user.role === 'guest') {
    query.guest = req.user.id;
    // Filter by event if specified (for microsite dashboard)
    if (event) {
      query.event = event;
    }
  } else if (req.user.role === 'planner') {
    // Filter by event if specified
    if (event) {
      query.event = event;
    }
  } else if (req.user.role === 'hotel') {
    // Get inventory items belonging to this hotel
    const hotelInventory = await Inventory.find({ hotel: req.user.id }).select('_id');
    query.inventory = { $in: hotelInventory.map((inv) => inv._id) };
  }

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const bookings = await Booking.find(query)
    .populate('event', 'name type startDate endDate')
    .populate('inventory', 'hotelName roomType pricePerNight')
    .populate('guest', 'name email phone')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking
 * @access  Private
 */
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event', 'name type startDate endDate location')
    .populate('inventory', 'hotelName roomType pricePerNight inclusions')
    .populate('guest', 'name email phone');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check access
  if (
    req.user.role === 'guest' &&
    booking.guest._id.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this booking',
    });
  }

  res.status(200).json({
    success: true,
    data: booking,
  });
});

/**
 * @route   POST /api/bookings
 * @desc    Create booking
 * @access  Private (Guest) or Public with guest details
 */
export const createBooking = asyncHandler(async (req, res) => {
  const { event, inventory, hotelProposal, roomDetails, pricing, specialRequests } = req.body;
  let { guestDetails } = req.body;

  console.log('📝 Creating booking with data:', JSON.stringify(req.body, null, 2));

  // Verify event
  const eventDoc = await Event.findById(event).populate('planner', 'name email');
  if (!eventDoc) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  const plannerId = eventDoc.planner?._id?.toString() || eventDoc.planner?.toString();

  let inventoryDoc = null;
  let proposalDoc = null;
  let pricePerNight = 0;
  let hotelName = '';
  let roomType = '';

  // Handle both inventory-based and hotel proposal-based bookings
  if (hotelProposal) {
    // Booking from microsite with hotel proposal
    proposalDoc = await HotelProposal.findById(hotelProposal);
    if (!proposalDoc) {
      return res.status(404).json({
        success: false,
        message: 'Hotel proposal not found',
      });
    }

    // Use pricing from the request (already calculated in frontend)
    pricePerNight = pricing?.pricePerNight || 0;
    hotelName = roomDetails.hotelName || proposalDoc.hotelName;
    roomType = roomDetails.roomType;

    console.log(`✅ Booking with hotel proposal: ${hotelName} - ${roomType}`);
  } else if (inventory) {
    // Traditional inventory-based booking
    inventoryDoc = await Inventory.findById(inventory);
    if (!inventoryDoc) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
    }

    // Check availability
    if (inventoryDoc.availableRooms < roomDetails.numberOfRooms) {
      return res.status(400).json({
        success: false,
        message: 'Not enough rooms available',
      });
    }

    pricePerNight = inventoryDoc.pricePerNight;
    hotelName = inventoryDoc.hotelName;
    roomType = inventoryDoc.roomType;

    console.log(`✅ Booking with inventory: ${hotelName} - ${roomType}`);
  }

  // Calculate pricing if not provided
  const checkIn = new Date(roomDetails.checkIn);
  const checkOut = new Date(roomDetails.checkOut);
  const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  const subtotal = pricing?.totalPrice || (pricePerNight * roomDetails.numberOfRooms * numberOfNights);
  const tax = subtotal * 0.1; // 10% tax
  const discount = pricing?.discount || 0;
  const totalAmount = subtotal + tax - discount;

  // Check if event is private - planner pays for all bookings
  const isPaidByPlanner = eventDoc.isPrivate;

  // For private events, enforce using the authenticated user's details (prevent email spoofing)
  if (eventDoc.isPrivate && req.user) {
    guestDetails = {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || guestDetails?.phone,
    };
  }

  // For private events, verify guest is invited
  if (eventDoc.isPrivate && req.user) {
    console.log('\n🔍 BOOKING ACCESS CHECK (Backend):');
    console.log('   Event:', eventDoc.name);
    console.log('   User Email:', req.user.email);
    console.log('   User Role:', req.user.role);
    console.log('   Planner ID:', plannerId);
    console.log('   User ID:', req.user.id);
    
    console.log('   Invited Guests:');
    eventDoc.invitedGuests.forEach((g, index) => {
      console.log(`      ${index + 1}. ${g.name} <${g.email}>`);
    });
    
    const isInvited = eventDoc.invitedGuests.some(
      (guest) => guest.email.toLowerCase() === req.user.email.toLowerCase()
    );
    
    console.log('   Email comparison:');
    console.log('      Looking for:', req.user.email.toLowerCase());
    console.log('      Is invited:', isInvited);
    console.log('      Is planner:', plannerId === req.user.id);
    
    if (!isInvited && plannerId !== req.user.id) {
      console.log('   ❌ Access denied: Not invited and not planner');
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not invited to this private event.',
      });
    }

    console.log('   ✅ Access granted');

    // Mark guest as accessed when they make their first booking
    if (isInvited) {
      const guest = eventDoc.invitedGuests.find(
        (g) => g.email.toLowerCase() === req.user.email.toLowerCase()
      );
      if (guest && !guest.hasAccessed) {
        guest.hasAccessed = true;
        console.log(`   → Marking guest ${guest.email} as hasAccessed=true`);
      }
    }
  }

  // For private events, allow guests to book before planner payment
  // Flow: Guests book first → Bookings accumulated → Planner pays total → Confirmed
  // Guests' bookings will have paymentStatus: 'unpaid' until planner pays

  // Check if Razorpay payment was made
  const hasRazorpayPayment = req.body.razorpay_payment_id && req.body.razorpay_order_id;
  
  // Payment status logic:
  // - Private events: bookings are 'unpaid' initially (planner pays later for all bookings)
  // - Public events: 'paid' if Razorpay payment exists, otherwise 'unpaid'
  const bookingPaymentStatus = eventDoc.isPrivate ? 'unpaid' : (hasRazorpayPayment ? 'paid' : 'unpaid');

  // Create booking
  const booking = await Booking.create({
    event,
    inventory: inventory || null,
    hotelProposal: hotelProposal || null,
    guest: req.user?.id || null,
    guestDetails: guestDetails || {
      name: req.user?.name,
      email: req.user?.email,
      phone: req.user?.phone,
    },
    roomDetails: {
      hotelName,
      roomType,
      numberOfRooms: roomDetails.numberOfRooms,
      checkIn,
      checkOut,
      numberOfNights,
    },
    pricing: {
      pricePerNight,
      totalNights: numberOfNights,
      subtotal,
      tax,
      discount,
      totalAmount,
      currency: 'INR',
    },
    specialRequests: specialRequests || req.body.specialRequests || '',
    status: 'pending',
    paymentStatus: bookingPaymentStatus,
    isPaidByPlanner,
    // Razorpay payment details if provided
    razorpay_order_id: req.body.razorpay_order_id || undefined,
    razorpay_payment_id: req.body.razorpay_payment_id || undefined,
    razorpay_signature: req.body.razorpay_signature || undefined,
  });

  // Create Payment record if Razorpay payment was made
  if (hasRazorpayPayment) {
    await Payment.create({
      booking: booking._id,
      event: event,
      payer: req.user?.id || booking._id,
      amount: totalAmount,
      currency: 'INR',
      paymentMethod: 'card', // Razorpay supports multiple methods
      paymentType: 'full',
      status: 'completed',
      gatewayResponse: {
        gateway: 'razorpay',
        order_id: req.body.razorpay_order_id,
        payment_id: req.body.razorpay_payment_id,
        signature: req.body.razorpay_signature,
      },
      processedAt: new Date(),
    });
    console.log(`💳 Payment record created for booking ${booking.bookingId}`);
  }

  // Note: Room availability is NOT decremented here - only when booking is APPROVED
  // This prevents issues with pending bookings that might get rejected
  console.log(`📝 Booking created with status: ${booking.status} (rooms will be decremented on approval)`);

  // Update event stats and total guest cost for private events
  eventDoc.totalBookings += 1;
  if (isPaidByPlanner) {
    eventDoc.totalGuestCost = (eventDoc.totalGuestCost || 0) + totalAmount;
  }
  await eventDoc.save();

  // Log action
  await createAuditLog({
    user: req.user?.id || booking._id, // Use booking ID if no user
    action: 'booking_create',
    resource: 'Booking',
    resourceId: booking._id,
    status: 'success',
  });

  try {
    const guestEmail = booking.guestDetails?.email;
    const plannerEmail = eventDoc.planner?.email;
    const eventName = eventDoc.name;

    if (guestEmail) {
      await sendEmail({
        to: guestEmail,
        subject: `Booking Received - ${eventName} | SyncStay`,
        html: bookingReceivedTemplate({
          guestName: booking.guestDetails?.name || 'Guest',
          eventName: eventName,
          hotelName: booking.roomDetails.hotelName,
          roomType: booking.roomDetails.roomType,
          numberOfRooms: booking.roomDetails.numberOfRooms,
          checkIn: new Date(booking.roomDetails.checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          checkOut: new Date(booking.roomDetails.checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          bookingId: booking.bookingId
        }),
        text: `Booking received for ${eventName}. Hotel: ${booking.roomDetails.hotelName}, Room: ${booking.roomDetails.roomType}.`,
      });
    }

    if (plannerEmail) {
      await sendEmail({
        to: plannerEmail,
        subject: `New Booking Request - ${eventName} | SyncStay`,
        html: plannerNewBookingTemplate({
          plannerName: eventDoc.planner?.name || 'Planner',
          eventName: eventName,
          guestName: booking.guestDetails?.name || 'N/A',
          guestEmail: booking.guestDetails?.email || 'N/A',
          hotelName: booking.roomDetails.hotelName,
          roomType: booking.roomDetails.roomType,
          numberOfRooms: booking.roomDetails.numberOfRooms,
          checkIn: new Date(booking.roomDetails.checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          checkOut: new Date(booking.roomDetails.checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          bookingId: booking.bookingId
        }),
        text: `New booking request for ${eventName}. Guest: ${booking.guestDetails?.name || 'N/A'} (${booking.guestDetails?.email || 'N/A'}).`,
      });
    }
  } catch (error) {
    console.error('Error sending booking notification emails:', error);
  }

  console.log(`✅ Booking created successfully: ${booking.bookingId || booking._id}`);

  // Emit socket event (will be handled by socket service)
  if (req.io) {
    req.io.to(`event-${event}`).emit('booking-created', {
      booking: booking._id,
      inventory: inventory,
      hotelProposal: hotelProposal,
      status: 'pending', // Room availability unchanged until approval
    });
  }

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: booking,
  });
});

/**
 * @route   PUT /api/bookings/:id/confirm
 * @desc    Confirm booking
 * @access  Private (Planner/Hotel)
 */
export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  booking.status = 'confirmed';
  await booking.save();

  res.status(200).json({
    success: true,
    message: 'Booking confirmed successfully',
    data: booking,
  });
});

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private
 */
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check authorization
  if (req.user.role === 'guest' && booking.guest.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this booking',
    });
  }

  // Restore availability (only if booking was confirmed)
  if (booking.status === 'confirmed') {
    if (booking.inventory) {
      const inventory = await Inventory.findById(booking.inventory);
      if (inventory) {
        inventory.availableRooms += booking.roomDetails.numberOfRooms;
        if (inventory.status === 'sold-out') {
          inventory.status = 'locked';
        }
        await inventory.save();
        console.log(`↩️ Restored inventory: ${inventory.availableRooms} rooms`);
      }
    }

    if (booking.hotelProposal) {
      const proposalDoc = await HotelProposal.findById(booking.hotelProposal);
      if (proposalDoc) {
        const roomTypeKey = booking.roomDetails.roomType === 'Single Room' ? 'singleRoom' : 
                            booking.roomDetails.roomType === 'Double Room' ? 'doubleRoom' : 'suite';
        
        if (proposalDoc.pricing[roomTypeKey]) {
          proposalDoc.pricing[roomTypeKey].availableRooms += booking.roomDetails.numberOfRooms;
          proposalDoc.totalRoomsOffered += booking.roomDetails.numberOfRooms;
          await proposalDoc.save();
          console.log(`↩️ Restored ${booking.roomDetails.roomType}: ${proposalDoc.pricing[roomTypeKey].availableRooms} rooms`);
        }
      }
    }
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = req.body.reason || '';
  await booking.save();

  // Update event stats
  const event = await Event.findById(booking.event);
  if (event) {
    event.totalBookings -= 1;
    await event.save();
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'booking_cancel',
    resource: 'Booking',
    resourceId: booking._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: booking,
  });
});

/**
 * @route   PUT /api/bookings/:id/approve
 * @desc    Approve booking (Planner only)
 * @access  Private (Planner)
 */
export const approveBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('event');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check if user is planner of this event
  if (booking.event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only the event planner can approve bookings',
    });
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending bookings can be approved',
    });
  }

  booking.status = 'confirmed';
  booking.approvedBy = req.user.id;
  booking.approvedAt = new Date();
  await booking.save();

  // Decrement room availability NOW (when confirmed)
  if (booking.inventory) {
    const inventoryDoc = await Inventory.findById(booking.inventory);
    if (inventoryDoc) {
      inventoryDoc.availableRooms -= booking.roomDetails.numberOfRooms;
      inventoryDoc.lastBookedAt = new Date();
      if (inventoryDoc.availableRooms === 0) {
        inventoryDoc.status = 'sold-out';
      }
      await inventoryDoc.save();
      console.log(`✅ Confirmed: Decremented inventory to ${inventoryDoc.availableRooms} rooms`);
    }
  }

  if (booking.hotelProposal) {
    const proposalDoc = await HotelProposal.findById(booking.hotelProposal);
    if (proposalDoc) {
      const roomTypeKey = booking.roomDetails.roomType === 'Single Room' ? 'singleRoom' : 
                          booking.roomDetails.roomType === 'Double Room' ? 'doubleRoom' : 'suite';
      
      if (proposalDoc.pricing[roomTypeKey]) {
        proposalDoc.pricing[roomTypeKey].availableRooms -= booking.roomDetails.numberOfRooms;
        proposalDoc.totalRoomsOffered -= booking.roomDetails.numberOfRooms;
        await proposalDoc.save();
        console.log(`✅ Confirmed: Decremented ${booking.roomDetails.roomType} to ${proposalDoc.pricing[roomTypeKey].availableRooms} rooms`);
      }
    }
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'booking_approve',
    resource: 'Booking',
    resourceId: booking._id,
    status: 'success',
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate('event', 'name')
    .populate('guest', 'name email');

  try {
    const guestEmail = populatedBooking.guest?.email || populatedBooking.guestDetails?.email;
    if (guestEmail) {
      await sendEmail({
        to: guestEmail,
        subject: `Booking Confirmed - ${populatedBooking.event?.name || 'Your Event'} | SyncStay`,
        html: bookingConfirmedTemplate({
          guestName: populatedBooking.guest?.name || populatedBooking.guestDetails?.name || 'Guest',
          eventName: populatedBooking.event?.name || 'Your Event',
          hotelName: populatedBooking.roomDetails.hotelName,
          roomType: populatedBooking.roomDetails.roomType,
          numberOfRooms: populatedBooking.roomDetails.numberOfRooms,
          checkIn: new Date(populatedBooking.roomDetails.checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          checkOut: new Date(populatedBooking.roomDetails.checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          bookingId: populatedBooking.bookingId,
          totalAmount: populatedBooking.pricing?.totalAmount ? `${populatedBooking.pricing.currency || 'INR'} ${populatedBooking.pricing.totalAmount.toFixed(2)}` : null
        }),
        text: `Your booking has been confirmed for ${populatedBooking.event?.name || 'your event'}.`,
      });
    }
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Booking approved successfully',
    data: populatedBooking,
  });
});

/**
 * @route   PUT /api/bookings/:id/reject
 * @desc    Reject booking (Planner only)
 * @access  Private (Planner)
 */
export const rejectBooking = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('event');

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Check if user is planner of this event
  if (booking.event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Only the event planner can reject bookings',
    });
  }

  if (booking.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Only pending bookings can be rejected',
    });
  }

  // No need to restore inventory - pending bookings never decremented availability
  console.log(`❌ Rejecting pending booking - no inventory changes needed`);

  booking.status = 'rejected';
  booking.rejectionReason = reason || 'No reason provided';
  await booking.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'booking_reject',
    resource: 'Booking',
    resourceId: booking._id,
    status: 'success',
  });

  const populatedBooking = await Booking.findById(booking._id)
    .populate('event', 'name')
    .populate('guest', 'name email');

  res.status(200).json({
    success: true,
    message: 'Booking rejected',
    data: populatedBooking,
  });
});

/**
 * @route   GET /api/bookings/planner/:eventId/billing
 * @desc    Get aggregated billing for private event (planner view)
 * @access  Private (Planner)
 */
export const getPlannerBilling = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if user is the planner
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view billing for this event',
    });
  }

  if (!event.isPrivate) {
    return res.status(400).json({
      success: false,
      message: 'This endpoint is only for private events',
    });
  }

  // Get all bookings for this event
  const bookings = await Booking.find({ event: eventId, isPaidByPlanner: true })
    .populate('guest', 'name email')
    .populate('inventory', 'hotelName roomType')
    .sort('createdAt');

  // Calculate totals
  const totalCost = bookings.reduce((sum, booking) => sum + booking.pricing.totalAmount, 0);
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const totalConfirmedCost = confirmedBookings.reduce((sum, b) => sum + b.pricing.totalAmount, 0);
  const totalPendingCost = pendingBookings.reduce((sum, b) => sum + b.pricing.totalAmount, 0);

  res.status(200).json({
    success: true,
    data: {
      eventName: event.name,
      isPrivate: event.isPrivate,
      totalGuests: event.invitedGuests.length,
      bookingsCount: bookings.length,
      confirmedCount: confirmedBookings.length,
      pendingCount: pendingBookings.length,
      totalCost,
      totalConfirmedCost,
      totalPendingCost,
      plannerPaidAmount: event.plannerPaidAmount || 0,
      remainingBalance: totalCost - (event.plannerPaidAmount || 0),
      bookings: bookings.map(b => ({
        bookingId: b.bookingId,
        guest: b.guest,
        hotel: b.roomDetails.hotelName,
        roomType: b.roomDetails.roomType,
        rooms: b.roomDetails.numberOfRooms,
        nights: b.roomDetails.numberOfNights,
        checkIn: b.roomDetails.checkIn,
        checkOut: b.roomDetails.checkOut,
        totalAmount: b.pricing.totalAmount,
        status: b.status,
        paymentStatus: b.paymentStatus,
        createdAt: b.createdAt,
      })),
    },
  });
});
