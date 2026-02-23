import Inventory from '../models/Inventory.js';
import Event from '../models/Event.js';
import InventoryGroup from '../models/InventoryGroup.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';
import * as groupingService from '../services/groupingService.js';
import * as recommendationService from '../services/groupHotelRecommendationService.js';

/**
 * @route   GET /api/inventory
 * @desc    Get all inventory (filtered by role)
 * @access  Private
 */
export const getInventory = asyncHandler(async (req, res) => {
  const { event, status } = req.query;
  let query = {};

  // Role-based filtering
  if (req.user.role === 'hotel') {
    query.hotel = req.user.id;
  }

  if (event) query.event = event;
  if (status) query.status = status;

  const inventory = await Inventory.find(query)
    .populate('event', 'name type startDate endDate')
    .populate('hotel', 'name organization')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: inventory.length,
    data: inventory,
  });
});

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory
 * @access  Private
 */
export const getInventoryById = asyncHandler(async (req, res) => {
  const inventory = await Inventory.findById(req.params.id)
    .populate('event', 'name type startDate endDate')
    .populate('hotel', 'name organization');

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found',
    });
  }

  res.status(200).json({
    success: true,
    data: inventory,
  });
});

/**
 * @route   GET /api/inventory/event/:eventId
 * @desc    Get available inventory for an event (for booking)
 * @access  Public/Private
 */
export const getAvailableInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.find({
    event: req.params.eventId,
    status: 'locked',
    availableRooms: { $gt: 0 },
  })
    .populate('hotel', 'name organization')
    .sort('pricePerNight');

  res.status(200).json({
    success: true,
    count: inventory.length,
    data: inventory,
  });
});

/**
 * @route   POST /api/inventory
 * @desc    Create inventory
 * @access  Private (Hotel/Planner)
 */
export const createInventory = asyncHandler(async (req, res) => {
  // Verify event exists
  const event = await Event.findById(req.body.event);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Set hotel ID
  if (req.user.role === 'hotel') {
    req.body.hotel = req.user.id;
  } else if (!req.body.hotel) {
    return res.status(400).json({
      success: false,
      message: 'Hotel ID is required',
    });
  }

  // Set initial available rooms equal to total rooms
  req.body.availableRooms = req.body.totalRooms;

  const inventory = await Inventory.create(req.body);

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'inventory_create',
    resource: 'Inventory',
    resourceId: inventory._id,
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'Inventory created successfully',
    data: inventory,
  });
});

/**
 * @route   PUT /api/inventory/:id
 * @desc    Update inventory
 * @access  Private (Hotel/Planner)
 */
export const updateInventory = asyncHandler(async (req, res) => {
  let inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found',
    });
  }

  // Check ownership for hotel users
  if (req.user.role === 'hotel' && inventory.hotel.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this inventory',
    });
  }

  inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'inventory_update',
    resource: 'Inventory',
    resourceId: inventory._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Inventory updated successfully',
    data: inventory,
  });
});

/**
 * @route   PUT /api/inventory/:id/lock
 * @desc    Lock inventory for event
 * @access  Private (Planner)
 */
export const lockInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found',
    });
  }

  inventory.status = 'locked';
  await inventory.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'inventory_lock',
    resource: 'Inventory',
    resourceId: inventory._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Inventory locked successfully',
    data: inventory,
  });
});

/**
 * @route   PUT /api/inventory/:id/release
 * @desc    Release inventory from event
 * @access  Private (Planner)
 */
export const releaseInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found',
    });
  }

  inventory.status = 'released';
  await inventory.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'inventory_release',
    resource: 'Inventory',
    resourceId: inventory._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Inventory released successfully',
    data: inventory,
  });
});

/**
 * @route   DELETE /api/inventory/:id
 * @desc    Delete inventory
 * @access  Private (Hotel/Admin)
 */
export const deleteInventory = asyncHandler(async (req, res) => {
  const inventory = await Inventory.findById(req.params.id);

  if (!inventory) {
    return res.status(404).json({
      success: false,
      message: 'Inventory not found',
    });
  }

  // Check ownership for hotel users
  if (req.user.role === 'hotel' && inventory.hotel.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this inventory',
    });
  }

  await inventory.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Inventory deleted successfully',
  });
});

/**
 * @route   POST /api/inventory/:eventId/groups/auto-generate
 * @desc    Auto-generate groups for public event
 * @access  Private (Planner)
 */
export const autoGenerateGroups = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const groups = await groupingService.autoGroupGuestsByRelationship(eventId);

  res.status(201).json({
    success: true,
    data: groups,
    message: 'Groups auto-generated successfully',
  });
});

/**
 * @route   POST /api/inventory/:eventId/groups
 * @desc    Create manual group (for private events)
 * @access  Private (Planner)
 */
export const createGroup = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { name, number, description, members, priority } = req.body;

  // Validate required fields
  if (!name || name.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Group name is required',
    });
  }

  if (number === undefined || number === null || number === '' || isNaN(number)) {
    return res.status(400).json({
      success: false,
      message: 'Number of people is required and must be a valid number',
    });
  }

  if (parseInt(number) < 1) {
    return res.status(400).json({
      success: false,
      message: 'Number of people must be at least 1',
    });
  }

  const group = await groupingService.createManualGroup(eventId, {
    name: name.trim(),
    number: parseInt(number),
    description: description && description.trim() ? description.trim() : undefined,
    members: members || [],
    priority: priority || 0,
  });

  res.status(201).json({
    success: true,
    data: group,
    message: 'Group created successfully',
  });
});

/**
 * @route   GET /api/inventory/:eventId/groups
 * @desc    Get all groups for an event
 * @access  Private (Planner)
 */
export const getEventGroups = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const groups = await groupingService.getGroupsByEvent(eventId);

  res.status(200).json({
    success: true,
    data: groups,
    message: 'Groups fetched successfully',
  });
});

/**
 * @route   PUT /api/inventory/:groupId/guests/assign
 * @desc    Assign guests to a group
 * @access  Private (Planner)
 */
export const assignGuestsToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { guestEmails } = req.body;

  if (!guestEmails || !Array.isArray(guestEmails)) {
    return res.status(400).json({
      success: false,
      message: 'Guest emails array is required',
    });
  }

  const group = await groupingService.assignGuestsToGroup(groupId, guestEmails);

  res.status(200).json({
    success: true,
    data: group,
    message: `${guestEmails.length} guests assigned to group`,
  });
});

/**
 * @route   DELETE /api/inventory/:groupId/guests/remove
 * @desc    Remove guest from group
 * @access  Private (Planner)
 */
export const removeGuestFromGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { guestEmail } = req.body;

  const group = await groupingService.removeGuestFromGroup(groupId, guestEmail);

  res.status(200).json({
    success: true,
    data: group,
    message: 'Guest removed from group',
  });
});

/**
 * @route   DELETE /api/inventory/:groupId
 * @desc    Delete a group
 * @access  Private (Planner)
 */
export const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await groupingService.deleteGroup(groupId);

  res.status(200).json({
    success: true,
    data: group,
    message: 'Group deleted successfully',
  });
});

/**
 * @route   GET /api/inventory/:eventId/recommendations
 * @desc    Get hotel recommendations for event (both group and individual)
 * @access  Private (Planner)
 */
export const getEventRecommendations = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const recommendations = await recommendationService.rankHotelsForEvent(eventId);

  res.status(200).json({
    success: true,
    data: recommendations,
    message: 'Recommendations computed successfully',
  });
});

/**
 * @route   GET /api/inventory/guest/:guestEmail/history
 * @desc    Get guest booking history
 * @access  Private (Planner)
 */
export const getGuestHistory = asyncHandler(async (req, res) => {
  const { guestEmail } = req.params;

  const history = await recommendationService.getGuestBookingHistory(guestEmail);

  res.status(200).json({
    success: true,
    data: history,
    message: 'Guest booking history fetched',
  });
});

/**
 * @route   PUT /api/inventory/:groupId/metadata
 * @desc    Update group metadata
 * @access  Private (Planner)
 */
export const updateGroupMetadata = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { metadata } = req.body;

  const group = await groupingService.updateGroupMetadata(groupId, metadata);

  res.status(200).json({
    success: true,
    data: group,
    message: 'Group metadata updated',
  });
});

/**
 * @route   PUT /api/inventory/:groupId/assign-hotel
 * @desc    Assign (or reassign) a hotel to a group. One hotel can serve multiple groups.
 * @access  Private (Planner)
 */
export const assignHotelToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { hotelId } = req.body;

  if (!hotelId) {
    return res.status(400).json({ success: false, message: 'hotelId is required' });
  }

  const group = await InventoryGroup.findById(groupId);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }

  // Upsert — remove existing entry for this hotel, then push fresh
  group.assignedHotels = group.assignedHotels.filter(
    (ah) => ah.hotel?.toString() !== hotelId
  );
  group.assignedHotels.push({
    hotel: hotelId,
    priority: group.assignedHotels.length + 1,
    assignedAt: new Date(),
  });
  await group.save();

  await group.populate('assignedHotels.hotel', 'name organization location tboData priceRange totalRooms averageRating facilities');

  res.status(200).json({
    success: true,
    data: group,
    message: 'Hotel assigned to group successfully',
  });
});

/**
 * @route   GET /api/inventory/:eventId/nearby-hotels
 * @desc    Find hotels within a radius (km) of a lat/lng point using Haversine distance.
 *          Returns hotels sorted by ascending distance.
 * @access  Private (Planner)
 * @query   lat, lng, radiusKm (default 15)
 */
export const getNearbyHotels = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm = 15, excludeId } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'lat and lng query params are required' });
  }

  const refLat = parseFloat(lat);
  const refLng = parseFloat(lng);
  const radius = parseFloat(radiusKm);

  // Haversine distance in km
  const toRad = (v) => (v * Math.PI) / 180;
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const hotels = await User.find({
    role: 'hotel',
    isActive: true,
    'tboData.latitude': { $exists: true, $ne: null },
    'tboData.longitude': { $exists: true, $ne: null },
  })
    .select('name organization location tboData priceRange totalRooms averageRating facilities')
    .lean();

  const nearby = hotels
    .map((h) => ({
      ...h,
      distanceKm: haversine(refLat, refLng, h.tboData.latitude, h.tboData.longitude),
    }))
    .filter((h) => {
      // Exclude the reference hotel itself and hotels beyond radius
      if (excludeId && h._id?.toString() === excludeId) return false;
      return h.distanceKm <= radius && h.distanceKm > 0.05;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);

  res.status(200).json({
    success: true,
    data: nearby,
    count: nearby.length,
  });
});
