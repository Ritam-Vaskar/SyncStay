import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Inventory from '../models/Inventory.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @route   GET /api/analytics/overview
 * @desc    Get platform overview statistics
 * @access  Private (Admin)
 */
export const getOverview = asyncHandler(async (req, res) => {
  const totalEvents = await Event.countDocuments();
  const totalBookings = await Booking.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalRevenue = await Payment.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const activeEvents = await Event.countDocuments({ status: 'active' });
  const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });

  res.status(200).json({
    success: true,
    data: {
      totalEvents,
      totalBookings,
      totalUsers,
      totalRevenue: totalRevenue[0]?.total || 0,
      activeEvents,
      confirmedBookings,
    },
  });
});

/**
 * @route   GET /api/analytics/event/:eventId
 * @desc    Get event-specific analytics
 * @access  Private (Planner)
 */
export const getEventAnalytics = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check ownership
  if (req.user.role === 'planner' && event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view analytics for this event',
    });
  }

  // Booking stats
  const totalBookings = await Booking.countDocuments({ event: eventId });
  const confirmedBookings = await Booking.countDocuments({
    event: eventId,
    status: 'confirmed',
  });
  const cancelledBookings = await Booking.countDocuments({
    event: eventId,
    status: 'cancelled',
  });

  // Revenue stats
  const revenueData = await Payment.aggregate([
    { $match: { event: event._id, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  // Inventory stats
  const inventoryStats = await Inventory.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: null,
        totalRooms: { $sum: '$totalRooms' },
        availableRooms: { $sum: '$availableRooms' },
        bookedRooms: { $sum: { $subtract: ['$totalRooms', '$availableRooms'] } },
      },
    },
  ]);

  // Booking trend (by day)
  const bookingTrend = await Booking.aggregate([
    { $match: { event: event._id } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      event: {
        id: event._id,
        name: event.name,
        type: event.type,
        status: event.status,
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
      },
      revenue: {
        total: revenueData[0]?.total || 0,
        target: event.totalRevenue || 0,
      },
      inventory: inventoryStats[0] || {
        totalRooms: 0,
        availableRooms: 0,
        bookedRooms: 0,
      },
      bookingTrend,
    },
  });
});

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin/Planner)
 */
export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, eventId } = req.query;

  let matchQuery = { status: 'completed' };

  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (eventId) {
    matchQuery.event = eventId;
  }

  const revenueByEvent = await Payment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$event',
        totalRevenue: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'event',
      },
    },
    { $unwind: '$event' },
    {
      $project: {
        eventName: '$event.name',
        eventType: '$event.type',
        totalRevenue: 1,
        paymentCount: 1,
      },
    },
  ]);

  const revenueByMonth = await Payment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      revenueByEvent,
      revenueByMonth,
    },
  });
});

/**
 * @route   GET /api/analytics/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { user, action, resource, limit = 50 } = req.query;

  let query = {};
  if (user) query.user = user;
  if (action) query.action = action;
  if (resource) query.resource = resource;

  const logs = await AuditLog.find(query)
    .populate('user', 'name email role')
    .limit(parseInt(limit))
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});
