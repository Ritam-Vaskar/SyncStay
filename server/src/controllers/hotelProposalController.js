import HotelProposal from '../models/HotelProposal.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   GET /api/hotel-proposals/rfps
 * @desc    Get all RFPs (events with status 'rfp-published') for hotels
 * @access  Private (Hotel only)
 */
export const getRFPs = asyncHandler(async (req, res) => {
  const events = await Event.find({ status: 'rfp-published' })
    .populate('planner', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

/**
 * @route   POST /api/hotel-proposals
 * @desc    Submit hotel proposal for an event RFP
 * @access  Private (Hotel only)
 */
export const submitProposal = asyncHandler(async (req, res) => {
  const {
    eventId,
    hotelName,
    pricing,
    totalRoomsOffered,
    amenities,
    facilities,
    additionalServices,
    specialOffer,
    notes,
    totalEstimatedCost,
  } = req.body;

  // Check if event exists and is accepting proposals
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  if (event.status !== 'rfp-published') {
    return res.status(400).json({
      success: false,
      message: 'Event is not accepting proposals',
    });
  }

  // Check if hotel already submitted proposal
  const existingProposal = await HotelProposal.findOne({
    event: eventId,
    hotel: req.user.id,
  });

  if (existingProposal) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted a proposal for this event',
    });
  }

  // Create proposal
  const proposal = await HotelProposal.create({
    event: eventId,
    hotel: req.user.id,
    hotelName,
    pricing,
    totalRoomsOffered,
    amenities,
    facilities,
    additionalServices,
    specialOffer,
    notes,
    totalEstimatedCost,
  });

  // Update event status to reviewing-proposals if first proposal
  const proposalCount = await HotelProposal.countDocuments({ event: eventId });
  if (proposalCount === 1) {
    event.status = 'reviewing-proposals';
    await event.save();
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'hotel_proposal_submit',
    resource: 'HotelProposal',
    resourceId: proposal._id,
    status: 'success',
    details: `Hotel submitted proposal for event: ${event.name}`,
  });

  res.status(201).json({
    success: true,
    message: 'Proposal submitted successfully',
    data: proposal,
  });
});

/**
 * @route   GET /api/hotel-proposals/my-proposals
 * @desc    Get all proposals submitted by the hotel
 * @access  Private (Hotel only)
 */
export const getMyProposals = asyncHandler(async (req, res) => {
  const proposals = await HotelProposal.find({ hotel: req.user.id })
    .populate('event', 'name startDate endDate location expectedGuests status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: proposals.length,
    data: proposals,
  });
});

/**
 * @route   GET /api/hotel-proposals/event/:eventId
 * @desc    Get all proposals for a specific event (for planner)
 * @access  Private (Planner only)
 */
export const getEventProposals = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Check if event belongs to planner
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view proposals for this event',
    });
  }

  const proposals = await HotelProposal.find({ event: eventId })
    .populate('hotel', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: proposals.length,
    data: proposals,
  });
});

/**
 * @route   PUT /api/hotel-proposals/:proposalId/select
 * @desc    Select a hotel proposal (planner selects hotels for event)
 * @access  Private (Planner only)
 */
export const selectProposal = asyncHandler(async (req, res) => {
  const { proposalId } = req.params;

  const proposal = await HotelProposal.findById(proposalId).populate('event');
  
  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  // Check if event belongs to planner
  if (proposal.event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to select proposals for this event',
    });
  }

  // Update proposal status
  proposal.status = 'selected';
  proposal.selectedByPlanner = true;
  proposal.selectionDate = new Date();
  await proposal.save();

  // Add hotel to event's selectedHotels array
  const event = await Event.findById(proposal.event._id);
  if (!event.selectedHotels) {
    event.selectedHotels = [];
  }
  
  event.selectedHotels.push({
    hotel: proposal.hotel,
    proposal: proposal._id,
  });
  
  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'hotel_proposal_select',
    resource: 'HotelProposal',
    resourceId: proposal._id,
    status: 'success',
    details: `Planner selected hotel proposal for event: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Hotel proposal selected successfully',
    data: proposal,
  });
});

/**
 * @route   PUT /api/hotel-proposals/event/:eventId/publish-microsite
 * @desc    Finalize hotel selection and publish microsite
 * @access  Private (Planner only)
 */
export const publishEventMicrosite = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

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
      message: 'Not authorized to publish this event',
    });
  }

  // Check if at least one hotel is selected
  if (!event.selectedHotels || event.selectedHotels.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one hotel before publishing',
    });
  }

  // Generate microsite if not exists
  if (!event.micrositeConfig || !event.micrositeConfig.customSlug) {
    const slug = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const timestamp = Date.now().toString().slice(-4);
    const uniqueSlug = `${slug}-${timestamp}`;

    event.micrositeConfig = {
      isPublished: true,
      customSlug: uniqueSlug,
      theme: {
        primaryColor: '#3b82f6',
      },
    };
  } else {
    event.micrositeConfig.isPublished = true;
  }

  // Update status to active
  event.status = 'active';
  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_microsite_publish',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Microsite published for event: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Microsite published successfully',
    data: event,
    micrositeUrl: `/microsite/${event.micrositeConfig.customSlug}`,
  });
});

/**
 * @route   PUT /api/hotel-proposals/:proposalId/update
 * @desc    Update hotel proposal (hotel can edit before selection)
 * @access  Private (Hotel only)
 */
export const updateProposal = asyncHandler(async (req, res) => {
  const { proposalId } = req.params;

  const proposal = await HotelProposal.findById(proposalId);
  
  if (!proposal) {
    return res.status(404).json({
      success: false,
      message: 'Proposal not found',
    });
  }

  // Check if proposal belongs to hotel
  if (proposal.hotel.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this proposal',
    });
  }

  // Cannot update if already selected
  if (proposal.selectedByPlanner) {
    return res.status(400).json({
      success: false,
      message: 'Cannot update a proposal that has been selected',
    });
  }

  // Update fields
  const allowedUpdates = [
    'pricing',
    'totalRoomsOffered',
    'amenities',
    'facilities',
    'additionalServices',
    'specialOffer',
    'notes',
    'totalEstimatedCost',
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      proposal[field] = req.body[field];
    }
  });

  await proposal.save();

  res.status(200).json({
    success: true,
    message: 'Proposal updated successfully',
    data: proposal,
  });
});
