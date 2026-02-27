import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Inventory from '../models/Inventory.js';
import InventoryGroup from '../models/InventoryGroup.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import HotelProposal from '../models/HotelProposal.js';
import asyncHandler from '../utils/asyncHandler.js';

// Activity logs for event tracking

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

/**
 * @route   GET /api/analytics/events/:eventId/activity-logs
 * @desc    Get activity logs for a specific event
 * @access  Private (Planner/Admin)
 */
export const getEventActivityLogs = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { action, limit = 100 } = req.query;

  // Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Authorization: Planner must own the event or be admin
  if (req.user.role !== 'admin' && event.planner.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view activity logs for this event',
    });
  }

  // Build query for event-related activities
  // We need to query broadly since resourceId might be proposal/booking/guest IDs, not event ID
  let query = {
    $or: [
      { resourceId: eventId },
      { 'details.eventId': eventId },
      { 'details.event': eventId },
    ],
  };

  // Filter by action type if specified
  if (action) {
    query.action = action;
  }

  // Relevant event actions
  const eventActions = [
    // Event actions
    'event_create',
    'event_update',
    'event_delete',
    'event_approve',
    'event_reject',
    'event_comment',
    'event_comment_reply',
    'event_privacy_toggle',
    'event_microsite_publish',
    // Hotel/Proposal actions
    'hotel_proposal_select',
    'hotel_proposal_deselect',
    'hotel_proposal_submit',
    'hotel_selection_confirmed',
    'hotel_select_recommended',
    'proposal_submit',
    'proposal_review',
    // Booking actions
    'booking_create',
    'booking_approve',
    'booking_cancel',
    'booking_reject',
    // Payment actions
    'planner_payment',
    'planner_payment_complete',
    'payment_process',
    'payment_refund',
    // Guest actions
    'guest_add',
    'guest_upload',
    'guest_remove',
    'guest_update',
    'guest_auto_register',
    'guest_invite_login',
    // Inventory actions
    'inventory_create',
    'inventory_update',
    'inventory_lock',
    'inventory_release',
    // Communication
    'chat_message_send',
  ];

  // Only fetch relevant actions if no specific action filter
  if (!action) {
    query.action = { $in: eventActions };
  }

  // For this event, we need to find all related resource IDs
  // Get all proposals, bookings, inventory, and inventory groups for this event
  const [proposals, bookings, inventories, inventoryGroups] = await Promise.all([
    HotelProposal.find({ event: eventId }).select('_id'),
    Booking.find({ event: eventId }).select('_id'),
    Inventory.find({ event: eventId }).select('_id'),
    InventoryGroup.find({ event: eventId }).select('_id'),
  ]);

  const relatedResourceIds = [
    eventId,
    ...proposals.map(p => p._id.toString()),
    ...bookings.map(b => b._id.toString()),
    ...inventories.map(i => i._id.toString()),
    ...inventoryGroups.map(g => g._id.toString()),
  ];

  // Update query to include all related resources
  query = {
    $and: [
      {
        $or: [
          { resourceId: { $in: relatedResourceIds } },
          { 'details.eventId': eventId },
          { 'details.event': eventId },
        ],
      },
      action ? { action } : { action: { $in: eventActions } },
    ],
  };

  const logs = await AuditLog.find(query)
    .populate('user', 'name email role')
    .limit(parseInt(limit))
    .sort('-createdAt');

  console.log(`[Activity Logs] Event ${eventId}: Found ${logs.length} logs from query`);

  // Deduplicate logs by _id (in case query conditions overlap)
  const uniqueLogs = Array.from(
    new Map(logs.map(log => [log._id.toString(), log])).values()
  );

  console.log(`[Activity Logs] Event ${eventId}: ${uniqueLogs.length} unique logs after deduplication`);
  if (logs.length !== uniqueLogs.length) {
    console.warn(`[Activity Logs] Event ${eventId}: Removed ${logs.length - uniqueLogs.length} duplicate logs`);
  }

  // Enrich logs with additional context for inventory and groups
  const enrichedLogs = await Promise.all(uniqueLogs.map(async (log) => {
    const logObj = log.toObject();
    
    // If inventory-related, fetch group and hotel details
    if (log.action && log.action.includes('inventory')) {
      try {
        // Check if details contain groupId or group information
        if (logObj.details?.groupId) {
          const group = await InventoryGroup.findById(logObj.details.groupId)
            .populate('assignedHotels.hotel', 'name email')
            .select('name category number members assignedHotels');
          
          if (group) {
            logObj.enrichedData = {
              group: {
                name: group.name,
                category: group.category,
                memberCount: group.number,
                members: group.members,
                assignedHotels: group.assignedHotels.map(ah => ({
                  hotelId: ah.hotel?._id,
                  hotelName: ah.hotel?.name,
                  hotelEmail: ah.hotel?.email,
                  priority: ah.priority,
                  assignedAt: ah.assignedAt,
                })),
              },
            };
          }
        }
        
        // Also fetch inventory details if inventoryId is present
        if (logObj.details?.inventoryId) {
          const inventory = await Inventory.findById(logObj.details.inventoryId)
            .populate('hotel', 'name email')
            .select('hotelName roomType totalRooms availableRooms blockedRooms pricePerNight status');
          
          if (inventory) {
            logObj.enrichedData = logObj.enrichedData || {};
            logObj.enrichedData.inventory = {
              hotelName: inventory.hotelName || inventory.hotel?.name,
              roomType: inventory.roomType,
              totalRooms: inventory.totalRooms,
              availableRooms: inventory.availableRooms,
              blockedRooms: inventory.blockedRooms,
              pricePerNight: inventory.pricePerNight,
              status: inventory.status,
            };
          }
        }
      } catch (err) {
        // Silently fail enrichment - return log as-is
        console.error('Error enriching log:', err);
      }
    }
    
    return logObj;
  }));

  res.status(200).json({
    success: true,
    count: enrichedLogs.length,
    data: enrichedLogs,
  });
});
