import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   GET /api/events
 * @desc    Get all events (filtered by role)
 * @access  Private
 */
export const getEvents = asyncHandler(async (req, res) => {
  const { status, type, search } = req.query;
  let query = {};

  // Role-based filtering
  if (req.user.role === 'planner') {
    query.planner = req.user.id;
  }

  // Additional filters
  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const events = await Event.find(query)
    .populate('planner', 'name email organization')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

/**
 * @route   GET /api/events/:id
 * @desc    Get single event
 * @access  Private
 */
export const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('planner', 'name email organization');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

/**
 * @route   POST /api/events
 * @desc    Create new event
 * @access  Private (Planner only)
 */
export const createEvent = asyncHandler(async (req, res) => {
  // Add planner to event
  req.body.planner = req.user.id;
  
  // Set status to pending-approval for planner-created events
  req.body.status = 'pending-approval';

  // Generate custom slug if not provided
  if (!req.body.micrositeConfig?.customSlug) {
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    req.body.micrositeConfig = {
      ...req.body.micrositeConfig,
      customSlug: `${slug}-${Date.now()}`,
      isPublished: false, // Not published until approved
    };
  }

  const event = await Event.create(req.body);

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_create',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'Event created and submitted for approval',
    data: event,
  });
});

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Private (Planner/Admin)
 */
export const updateEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check ownership (if not admin)
  if (req.user.role !== 'admin' && event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this event',
    });
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_update',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: event,
  });
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private (Planner/Admin)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check ownership (if not admin)
  if (req.user.role !== 'admin' && event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this event',
    });
  }

  await event.deleteOne();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_delete',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully',
  });
});

/**
 * @route   GET /api/events/microsite/:slug
 * @desc    Get event by microsite slug (Public)
 * @access  Public
 */
export const getEventBySlug = asyncHandler(async (req, res) => {
  const event = await Event.findOne({
    'micrositeConfig.customSlug': req.params.slug,
    'micrositeConfig.isPublished': true,
  }).populate('planner', 'name organization');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event microsite not found or not published',
    });
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event and publish microsite
 * @access  Private (Admin only)
 */
export const approveEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  if (event.status !== 'pending-approval') {
    return res.status(400).json({
      success: false,
      message: 'Event is not pending approval',
    });
  }

  // Approve event - change status to rfp-published (not active yet)
  // Microsite will be published after planner selects hotels
  event.status = 'rfp-published';
  event.approvedBy = req.user.id;
  event.approvedAt = new Date();
  // Don't publish microsite yet - wait for hotel selection
  // event.micrositeConfig.isPublished = true;

  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_approve',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Event approved as RFP, now visible to hotels: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Event approved and published as RFP to hotels',
    data: event,
  });
});

/**
 * @route   PUT /api/events/:id/reject
 * @desc    Reject event
 * @access  Private (Admin only)
 */
export const rejectEvent = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  if (event.status !== 'pending-approval') {
    return res.status(400).json({
      success: false,
      message: 'Event is not pending approval',
    });
  }

  event.status = 'rejected';
  event.rejectionReason = reason;
  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_reject',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Rejection reason: ${reason}`,
  });

  res.status(200).json({
    success: true,
    message: 'Event rejected',
    data: event,
  });
});
