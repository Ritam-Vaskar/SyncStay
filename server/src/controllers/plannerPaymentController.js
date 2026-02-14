import asyncHandler from '../utils/asyncHandler.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   POST /api/events/:eventId/planner-payment
 * @desc    Process planner payment for private event
 * @access  Private (Planner only)
 */
export const processPlannerPayment = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { paymentDetails } = req.body;

  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if event belongs to planner
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to make payment for this event',
    });
  }

  // Check if event is private
  if (!event.isPrivate) {
    return res.status(400).json({
      success: false,
      message: 'This is not a private event. Payment not required.',
    });
  }

  // Check if already paid
  if (event.plannerPaymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Payment already completed for this event',
    });
  }

  // Verify payment details
  if (!paymentDetails || !paymentDetails.transactionId || !paymentDetails.amount) {
    return res.status(400).json({
      success: false,
      message: 'Payment details (transactionId and amount) are required',
    });
  }

  // In production, verify payment with payment gateway here
  // For now, accept the payment details as-is

  // Update event payment status
  event.plannerPaymentStatus = 'paid';
  event.plannerPaymentAmount = paymentDetails.amount;
  event.plannerPaidAt = new Date();
  event.plannerPaymentDetails = {
    transactionId: paymentDetails.transactionId,
    paymentMethod: paymentDetails.paymentMethod || 'card',
    paymentGateway: paymentDetails.paymentGateway || 'razorpay',
  };

  await event.save();

  // Create payment record
  await Payment.create({
    event: eventId,
    payer: req.user.id,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency || 'INR',
    paymentMethod: paymentDetails.paymentMethod || 'card',
    paymentType: 'planner-upfront',
    status: 'completed',
    gatewayResponse: {
      gateway: paymentDetails.paymentGateway || 'razorpay',
      transaction_id: paymentDetails.transactionId,
      payment_id: paymentDetails.paymentId,
      order_id: paymentDetails.orderId,
    },
    processedAt: new Date(),
  });

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'planner_payment_complete',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Planner paid ₹${paymentDetails.amount} for private event: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Payment processed successfully',
    data: {
      eventId: event._id,
      paymentStatus: event.plannerPaymentStatus,
      amount: event.plannerPaymentAmount,
      paidAt: event.plannerPaidAt,
    },
  });
});

/**
 * @route   GET /api/events/:eventId/planner-payment-status
 * @desc    Get planner payment status for private event
 * @access  Private (Planner only)
 */
export const getPlannerPaymentStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId).select(
    'name isPrivate plannerPaymentStatus plannerPaymentAmount plannerPaidAt plannerPaymentDetails selectedHotels'
  );

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if event belongs to planner
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view payment details for this event',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      eventName: event.name,
      isPrivate: event.isPrivate,
      paymentStatus: event.plannerPaymentStatus,
      paymentAmount: event.plannerPaymentAmount,
      paidAt: event.plannerPaidAt,
      paymentDetails: event.plannerPaymentDetails,
      selectedHotelsCount: event.selectedHotels?.length || 0,
    },
  });
});
