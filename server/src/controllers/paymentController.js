import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   GET /api/payments
 * @desc    Get all payments (filtered by role)
 * @access  Private
 */
export const getPayments = asyncHandler(async (req, res) => {
  const { booking, event, status } = req.query;
  let query = {};

  // Role-based filtering
  if (req.user.role === 'guest') {
    query.payer = req.user.id;
  }

  if (booking) query.booking = booking;
  if (event) query.event = event;
  if (status) query.status = status;

  const payments = await Payment.find(query)
    .populate('booking', 'bookingId roomDetails')
    .populate('event', 'name type')
    .populate('payer', 'name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});

/**
 * @route   GET /api/payments/:id
 * @desc    Get single payment
 * @access  Private
 */
export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('booking', 'bookingId roomDetails')
    .populate('event', 'name type')
    .populate('payer', 'name email');

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found',
    });
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

/**
 * @route   POST /api/payments
 * @desc    Process payment
 * @access  Private
 */
export const processPayment = asyncHandler(async (req, res) => {
  const { booking, amount, paymentMethod, paymentType } = req.body;

  // Verify booking
  const bookingDoc = await Booking.findById(booking);
  if (!bookingDoc) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found',
    });
  }

  // Mock payment processing
  const mockPaymentSuccess = true; // In real app, integrate with payment gateway

  if (!mockPaymentSuccess) {
    return res.status(400).json({
      success: false,
      message: 'Payment processing failed',
    });
  }

  // Create payment record
  const payment = await Payment.create({
    booking,
    event: bookingDoc.event,
    payer: req.user.id,
    amount,
    paymentMethod,
    paymentType,
    status: 'completed',
    completedAt: new Date(),
    gatewayResponse: {
      mock: true,
      message: 'Payment processed successfully (mock)',
    },
  });

  // Update booking payment status
  const totalPaid = await Payment.aggregate([
    { $match: { booking: bookingDoc._id, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const paidAmount = totalPaid[0]?.total || 0;
  const totalAmount = bookingDoc.pricing.totalAmount;

  if (paidAmount >= totalAmount) {
    bookingDoc.paymentStatus = 'paid';
    bookingDoc.status = 'confirmed';
  } else if (paidAmount > 0) {
    bookingDoc.paymentStatus = 'partial';
  }
  await bookingDoc.save();

  // Update event revenue
  const event = await Event.findById(bookingDoc.event);
  if (event) {
    event.totalRevenue += amount;
    await event.save();
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'payment_process',
    resource: 'Payment',
    resourceId: payment._id,
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'Payment processed successfully',
    data: payment,
  });
});

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Refund payment
 * @access  Private (Admin)
 */
export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found',
    });
  }

  if (payment.status === 'refunded') {
    return res.status(400).json({
      success: false,
      message: 'Payment already refunded',
    });
  }

  // Mock refund processing
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();

  // Update booking
  const booking = await Booking.findById(payment.booking);
  if (booking) {
    booking.paymentStatus = 'refunded';
    await booking.save();
  }

  // Update event revenue
  const event = await Event.findById(payment.event);
  if (event) {
    event.totalRevenue -= payment.amount;
    await event.save();
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'payment_refund',
    resource: 'Payment',
    resourceId: payment._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Payment refunded successfully',
    data: payment,
  });
});

/**
 * @route   POST /api/payments/razorpay/create-order
 * @desc    Create Razorpay order for booking payment or planner payment
 * @access  Public
 */
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, bookingData, customerEmail, customerName, currency, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required',
    });
  }

  // Initialize Razorpay
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  // Determine if this is a planner payment or guest booking payment
  const isPlannerPayment = notes && notes.type === 'planner_payment';
  
  // Prepare order notes
  let orderNotes = {};
  if (isPlannerPayment) {
    // Planner payment - use provided notes
    orderNotes = notes;
  } else {
    // Guest booking payment - use booking data
    orderNotes = {
      booking_type: 'event_hotel_booking',
      customer_email: customerEmail || '',
      customer_name: customerName || '',
      event_id: bookingData?.event || '',
      hotel_name: bookingData?.roomDetails?.hotelName || '',
    };
  }

  // Create order - amount should be in paise
  // For planner payment: amount is in rupees, convert to paise
  // For guest payment: amount is in rupees, convert to paise
  const amountInPaise = Math.round(amount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: currency || 'INR',
    receipt: `receipt_${Date.now()}`,
    notes: orderNotes,
  });

  const displayAmount = (amountInPaise / 100).toFixed(2);
  console.log(`💳 Razorpay order created: ${order.id} for ₹${displayAmount} (${isPlannerPayment ? 'Planner Payment' : 'Guest Booking'})`);

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * @route   POST /api/payments/razorpay/verify
 * @desc    Verify Razorpay payment signature
 * @access  Public
 */
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingData,
  } = req.body;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('❌ Invalid Razorpay signature');
    return res.status(400).json({
      success: false,
      message: 'Invalid payment signature',
    });
  }

  // Fetch payment details from Razorpay to verify amount
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const payment = await razorpay.payments.fetch(razorpay_payment_id);

  // Validate payment status
  if (payment.status !== 'captured') {
    return res.status(400).json({
      success: false,
      message: 'Payment not captured',
    });
  }

  console.log(`✅ Razorpay payment verified: ${razorpay_payment_id}`);

  // Return payment details for booking creation
  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    data: {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      status: payment.status,
    },
  });
});
