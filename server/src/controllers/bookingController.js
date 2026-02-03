import Booking from '../models/Booking.js';
import Inventory from '../models/Inventory.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

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
  } else if (req.user.role === 'planner' && event) {
    query.event = event;
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
  const { event, inventory, roomDetails, guestDetails } = req.body;

  // Verify event and inventory
  const eventDoc = await Event.findById(event);
  if (!eventDoc) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  const inventoryDoc = await Inventory.findById(inventory);
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

  // Calculate pricing
  const checkIn = new Date(roomDetails.checkIn || inventoryDoc.checkInDate);
  const checkOut = new Date(roomDetails.checkOut || inventoryDoc.checkOutDate);
  const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  const subtotal = inventoryDoc.pricePerNight * roomDetails.numberOfRooms * numberOfNights;
  const tax = subtotal * 0.1; // 10% tax
  const discount = req.body.pricing?.discount || 0;
  const totalAmount = subtotal + tax - discount;

  // Check if event is private - planner pays for all bookings
  const isPaidByPlanner = eventDoc.isPrivate;

  // Create booking
  const booking = await Booking.create({
    event,
    inventory,
    guest: req.user.id,
    guestDetails: guestDetails || {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
    },
    roomDetails: {
      hotelName: inventoryDoc.hotelName,
      roomType: inventoryDoc.roomType,
      numberOfRooms: roomDetails.numberOfRooms,
      checkIn,
      checkOut,
      numberOfNights,
    },
    pricing: {
      pricePerNight: inventoryDoc.pricePerNight,
      totalNights: numberOfNights,
      subtotal,
      tax,
      discount,
      totalAmount,
      currency: inventoryDoc.currency,
    },
    specialRequests: req.body.specialRequests || '',
    status: 'pending',
    paymentStatus: isPaidByPlanner ? 'unpaid' : 'unpaid',
    isPaidByPlanner,
  });

  // Update inventory
  inventoryDoc.availableRooms -= roomDetails.numberOfRooms;
  inventoryDoc.lastBookedAt = new Date();
  if (inventoryDoc.availableRooms === 0) {
    inventoryDoc.status = 'sold-out';
  }
  await inventoryDoc.save();

  // Update event stats and total guest cost for private events
  eventDoc.totalBookings += 1;
  if (isPaidByPlanner) {
    eventDoc.totalGuestCost = (eventDoc.totalGuestCost || 0) + totalAmount;
  }
  await eventDoc.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'booking_create',
    resource: 'Booking',
    resourceId: booking._id,
    status: 'success',
  });

  // Emit socket event (will be handled by socket service)
  if (req.io) {
    req.io.to(`event-${event}`).emit('booking-created', {
      booking: booking._id,
      inventory: inventory,
      availableRooms: inventoryDoc.availableRooms,
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

  // Restore inventory
  const inventory = await Inventory.findById(booking.inventory);
  if (inventory) {
    inventory.availableRooms += booking.roomDetails.numberOfRooms;
    if (inventory.status === 'sold-out') {
      inventory.status = 'locked';
    }
    await inventory.save();
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

  // Restore inventory
  const inventory = await Inventory.findById(booking.inventory);
  if (inventory) {
    inventory.availableRooms += booking.roomDetails.numberOfRooms;
    if (inventory.status === 'sold-out') {
      inventory.status = 'locked';
    }
    await inventory.save();
  }

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
