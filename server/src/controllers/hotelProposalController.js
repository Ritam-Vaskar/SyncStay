import HotelProposal from '../models/HotelProposal.js';
import Event from '../models/Event.js';
import HotelActivity from '../models/HotelActivity.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';
import sendEmail from '../utils/mail.js';
import config from '../config/index.js';
import { updateHotelActivityEmbedding } from '../services/embeddingService.js';

/**
 * @route   GET /api/hotel-proposals/rfps
 * @desc    Get all RFPs (events with status 'rfp-published' or 'reviewing-proposals') for hotels
 * @access  Private (Hotel only)
 */
export const getRFPs = asyncHandler(async (req, res) => {
  // Show events that are either newly published or already have some proposals
  // This allows multiple hotels to submit proposals for the same event
  const events = await Event.find({ 
    status: { $in: ['rfp-published', 'reviewing-proposals'] } 
  })
    .populate('planner', 'name email organization')
    .sort({ createdAt: -1 });

  // Add proposal count for each event
  const eventsWithProposalCount = await Promise.all(
    events.map(async (event) => {
      const proposalCount = await HotelProposal.countDocuments({ event: event._id });
      return {
        ...event.toObject(),
        proposalCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: eventsWithProposalCount.length,
    data: eventsWithProposalCount,
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
  const event = await Event.findById(eventId).populate('planner', 'name email');
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Allow proposals for both rfp-published and reviewing-proposals statuses
  if (!['rfp-published', 'reviewing-proposals'].includes(event.status)) {
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

  try {
    if (event.planner?.email) {
      await sendEmail({
        to: event.planner.email,
        subject: `New hotel proposal for ${event.name}`,
        html: `
          <p>Hi ${event.planner.name || 'Planner'},</p>
          <p>A hotel has submitted a proposal for your event <strong>${event.name}</strong>.</p>
          <ul>
            <li><strong>Hotel:</strong> ${hotelName}</li>
            <li><strong>Total Rooms Offered:</strong> ${totalRoomsOffered}</li>
            <li><strong>Total Estimated Cost:</strong> ${totalEstimatedCost || 'N/A'}</li>
          </ul>
          <p>Please review the proposal in your dashboard.</p>
        `,
        text: `New hotel proposal for ${event.name} from ${hotelName}. Please review in your dashboard.`,
      });
    }
  } catch (error) {
    console.error('Error sending proposal notification email:', error);
  }

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

  // Toggle selection
  const wasSelected = proposal.selectedByPlanner;
  proposal.status = wasSelected ? 'submitted' : 'selected';
  proposal.selectedByPlanner = !wasSelected;
  proposal.selectionDate = wasSelected ? null : new Date();
  await proposal.save();

  // Rebuild event's selectedHotels from all currently selected proposals
  const event = await Event.findById(proposal.event._id);
  const allSelected = await HotelProposal.find({ event: event._id, selectedByPlanner: true });
  event.selectedHotels = allSelected.map(p => ({
    hotel: p.hotel,
    proposal: p._id,
  }));
  
  // For public events, auto-activate when at least one hotel is selected
  if (!event.isPrivate && !wasSelected && allSelected.length > 0) {
    if (event.status === 'reviewing-proposals' || event.status === 'pending-approval') {
      event.status = 'active';
      // Also auto-publish microsite
      if (!event.micrositeConfig || !event.micrositeConfig.isPublished) {
        const slug = event.micrositeConfig?.customSlug || event.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        event.micrositeConfig = {
          ...event.micrositeConfig,
          isPublished: true,
          customSlug: event.micrositeConfig?.customSlug || `${slug}-${Date.now().toString().slice(-4)}`,
          theme: event.micrositeConfig?.theme || { primaryColor: '#3b82f6' },
        };
      }
    }
  }
  
  await event.save();

  // ── Hotel Activity hook ──────────────────────────────────────────────────────
  // Record the selection so the hotel's activity-history embedding stays current.
  // Fire-and-forget (never block the HTTP response).
  if (!wasSelected) {
    HotelActivity.findOneAndUpdate(
      { hotel: proposal.hotel, event: event._id },
      {
        $setOnInsert: {
          hotel: proposal.hotel,
          event: event._id,
          eventType: event.type || 'other',
          eventName: event.name,
          eventScale: event.expectedGuests > 500 ? 'large' : event.expectedGuests > 100 ? 'medium' : 'small',
          eventLocation: event.location?.city || '',
          eventDate: event.startDate,
          source: 'proposal_selected',
        },
        $set: { outcome: 'selected' },
      },
      { upsert: true, new: true }
    )
      .then(() => updateHotelActivityEmbedding(proposal.hotel))
      .catch(err => console.error('[HotelActivity] update failed:', err.message));
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: wasSelected ? 'hotel_proposal_deselect' : 'hotel_proposal_select',
    resource: 'HotelProposal',
    resourceId: proposal._id,
    status: 'success',
    details: `Planner ${wasSelected ? 'deselected' : 'selected'} hotel proposal for event: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: `Hotel proposal ${wasSelected ? 'deselected' : 'selected'} successfully`,
    data: proposal,
  });
});

/**
 * @route   POST /api/hotel-proposals/event/:eventId/confirm-selection
 * @desc    Confirm hotel selection - replaces all selections atomically (works for public & private)
 * @access  Private (Planner only)
 */
export const confirmHotelSelection = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { selectedProposalIds } = req.body; // Array of proposal IDs

  if (!selectedProposalIds || !Array.isArray(selectedProposalIds) || selectedProposalIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one hotel proposal',
    });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  // Don't allow re-selection if already active (already paid/published)
  if (event.status === 'active') {
    return res.status(400).json({
      success: false,
      message: 'Event is already active. Hotels cannot be changed.',
    });
  }

  // Reset ALL proposals for this event first
  await HotelProposal.updateMany(
    { event: eventId },
    { $set: { selectedByPlanner: false, status: 'submitted', selectionDate: null } }
  );

  // Mark the selected ones
  const proposals = await HotelProposal.find({ _id: { $in: selectedProposalIds }, event: eventId });
  if (proposals.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid proposals found' });
  }

  await HotelProposal.updateMany(
    { _id: { $in: selectedProposalIds }, event: eventId },
    { $set: { selectedByPlanner: true, status: 'selected', selectionDate: new Date() } }
  );

  // Calculate total cost
  let totalCost = 0;
  const selectedHotels = [];
  for (const proposal of proposals) {
    totalCost += proposal.totalEstimatedCost || 0;
    selectedHotels.push({ hotel: proposal.hotel, proposal: proposal._id });
  }

  // Replace event.selectedHotels entirely (no duplicates ever)
  event.selectedHotels = selectedHotels;

  if (event.isPrivate) {
    event.plannerPaymentAmount = totalCost;
    event.plannerPaymentStatus = 'pending';
  } else {
    // For public events, automatically activate when hotels are selected
    if (event.status === 'reviewing-proposals' || event.status === 'pending-approval') {
      event.status = 'active';
      // Also publish the microsite automatically for public events
      if (!event.micrositeConfig || !event.micrositeConfig.isPublished) {
        const slug = event.micrositeConfig?.customSlug || event.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        event.micrositeConfig = {
          ...event.micrositeConfig,
          isPublished: true,
          customSlug: event.micrositeConfig?.customSlug || `${slug}-${Date.now().toString().slice(-4)}`,
          theme: event.micrositeConfig?.theme || { primaryColor: '#3b82f6' },
        };
      }
    }
  }

  await event.save();

  await createAuditLog({
    user: req.user.id,
    action: 'hotel_selection_confirmed',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Confirmed ${selectedHotels.length} hotel(s) for event: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: `${selectedHotels.length} hotel(s) confirmed successfully`,
    data: {
      selectedHotels,
      totalAmount: totalCost,
      currency: 'INR',
      isPrivate: event.isPrivate,
    },
  });
});

/**
 * @route   PUT /api/hotel-proposals/event/:eventId/publish-microsite
 * @desc    Finalize hotel selection and publish microsite (for public events or after payment for private events)
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

  // For private events, require planner payment BEFORE publishing
  if (event.isPrivate && event.plannerPaymentStatus !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Payment required for private events. Please complete payment via /api/events/:id/planner-payment before publishing microsite.',
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
    details: `Microsite published for event: ${event.name} (${event.isPrivate ? 'Private' : 'Public'})`,
  });

  console.log(`🌐 Microsite published: ${event.name} (${event.isPrivate ? 'Private - Payment completed' : 'Public'})`);

  // Create embedding for public events only (private events are not discoverable)
  if (!event.isPrivate) {
    try {
      const mlUrl = config.mlServerUrl;
      const response = await fetch(`${mlUrl}/event/embedding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event._id.toString(),
          name: event.name,
          type: event.type || '',
          description: event.description || '',
          startDate: event.startDate?.toISOString() || '',
          endDate: event.endDate?.toISOString() || '',
          location: {
            city: event.location?.city || '',
            country: event.location?.country || '',
            venue: event.location?.venue || '',
          },
          customSlug: event.micrositeConfig?.customSlug || '',
        }),
      });

      const result = await response.json();
      console.log(`🧠 Event embedding created: ${result.chunks_created} chunks`);
    } catch (err) {
      // Non-blocking — log but don't fail the publish
      console.error('⚠️ Failed to create event embedding:', err.message);
    }
  }

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

/**
 * @route   GET /api/hotel-proposals/microsite/:slug/selected
 * @desc    Get selected hotel proposals for a microsite (filtered by guest group if authenticated)
 * @access  Public (with optional auth for group filtering)
 */
export const getSelectedProposalsForMicrosite = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  console.log(`🔍 Fetching selected proposals for microsite: ${slug}`);

  // Find event by slug
  const event = await Event.findOne({
    'micrositeConfig.customSlug': slug,
    'micrositeConfig.isPublished': true,
  });

  if (!event) {
    console.warn(`⚠️ Event not found for slug: ${slug}`);
    return res.status(404).json({
      success: false,
      message: 'Event not found or not published',
    });
  }

  // Get selected hotel proposals
  if (!event.selectedHotels || event.selectedHotels.length === 0) {
    console.log('ℹ️ No hotels selected yet');
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: 'No hotels selected yet',
    });
  }

  // Fetch full proposal details for selected hotels
  const proposalIds = event.selectedHotels.map(sh => sh.proposal);
  let selectedProposals = await HotelProposal.find({
    _id: { $in: proposalIds },
    // Don't filter by selectedByPlanner - the fact that it's in event.selectedHotels means it's selected
  })
    .populate('hotel', 'name email phone organization')
    .sort({ hotelName: 1 });

  console.log(`✅ Found ${selectedProposals.length} total selected proposals`);

  // Filter by guest group if user is authenticated and has group assignment
  if (req.user && req.user.email) {
    try {
      // Import InventoryGroup model
      const InventoryGroup = (await import('../models/InventoryGroup.js')).default;
      
      // Find guest's group by email in members array
      const guestGroup = await InventoryGroup.findOne({
        event: event._id,
        'members.guestEmail': req.user.email,
      }).populate('assignedHotels.hotel', '_id');

      if (guestGroup && guestGroup.assignedHotels && guestGroup.assignedHotels.length > 0) {
        // Extract hotel IDs from the group's assigned hotels
        const assignedHotelIds = guestGroup.assignedHotels
          .map(ah => ah.hotel?._id?.toString() || ah.hotel?.toString())
          .filter(Boolean);

        console.log(`🎯 Guest ${req.user.email} belongs to group "${guestGroup.name}" with ${assignedHotelIds.length} assigned hotels`);

        // Filter proposals to only show hotels assigned to this guest's group
        selectedProposals = selectedProposals.filter(proposal => {
          const hotelId = proposal.hotel?._id?.toString();
          return assignedHotelIds.includes(hotelId);
        });

        console.log(`✅ Filtered to ${selectedProposals.length} proposals for guest's group`);
      } else {
        console.log(`ℹ️ Guest ${req.user.email} has no group assignment or no hotels assigned to group - showing all hotels`);
      }
    } catch (error) {
      console.error('Error filtering hotels by group:', error);
      // If filtering fails, show all hotels (fail open for better UX)
    }
  } else {
    console.log('ℹ️ No authenticated user - showing all hotels');
  }

  res.status(200).json({
    success: true,
    count: selectedProposals.length,
    data: selectedProposals,
  });
});
