import Inventory from '../models/Inventory.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

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
