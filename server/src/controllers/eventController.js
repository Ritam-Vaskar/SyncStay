import Event from '../models/Event.js';
import User from '../models/User.js';
import HotelActivity from '../models/HotelActivity.js';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';
import { createAuditLog } from '../middlewares/auditLogger.js';
import sendEmail from '../utils/mail.js';
import { generateEventEmbedding, updateHotelActivityEmbedding } from '../services/embeddingService.js';
import { upsertVector } from '../config/qdrant.js';
import tboService from '../services/tboService.js';
import tboSearchService from '../services/tboSearchService.js';

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
  console.log('📝 Creating event with data:', JSON.stringify(req.body, null, 2));
  
  // Add planner to event
  req.body.planner = req.user.id;
  
  // Set status to pending-approval for planner-created events
  req.body.status = 'pending-approval';

  // Handle location field - convert string to object if needed
  if (req.body.location && typeof req.body.location === 'string') {
    req.body.location = {
      city: req.body.location,
      country: 'India', // Default country
      venue: ''
    };
  }

  // Normalize location data
  if (req.body.location) {
    // Default country to India if not provided
    if (!req.body.location.country || req.body.location.country.trim() === '') {
      req.body.location.country = 'India';
    }

    // Normalize city names for consistency
    const cityNormalizations = {
      'dumdum': 'Kolkata',
      'dum dum': 'Kolkata',
      'new delhi': 'Delhi',
      'newdelhi': 'Delhi',
      'bangaluru': 'Bangalore',
      'bengaluru': 'Bangalore',
      'mumbai city': 'Mumbai',
      'hyd': 'Hyderabad',
    };

    const cityLower = req.body.location.city?.toLowerCase().trim();
    if (cityLower && cityNormalizations[cityLower]) {
      req.body.location.city = cityNormalizations[cityLower];
    }
  }

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

  // Note: Embeddings are NOT generated on creation to save costs
  // They will be generated automatically when the event becomes active

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_create',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
  });

  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('email name');
    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: `New event pending approval: ${event.name}`,
        html: `
          <p>Hi Admin,</p>
          <p>A new event has been created and is awaiting approval.</p>
          <ul>
            <li><strong>Event:</strong> ${event.name}</li>
            <li><strong>Type:</strong> ${event.type}</li>
            <li><strong>Planner:</strong> ${req.user.name} (${req.user.email})</li>
            <li><strong>Dates:</strong> ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}</li>
          </ul>
          <p>Please review and approve the event in the admin dashboard.</p>
        `,
        text: `New event pending approval: ${event.name}. Planner: ${req.user.name} (${req.user.email}).`,
      });
    }
  } catch (error) {
    console.error('Error sending admin notification email:', error);
  }

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

  // Handle location field - convert string to object if needed
  if (req.body.location && typeof req.body.location === 'string') {
    req.body.location = {
      city: req.body.location,
      country: '',
      venue: ''
    };
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // ── Event completion hook ────────────────────────────────────────────────────
  // When status changes to 'completed', mark all selected-hotel activities as
  // completed and refresh their activity-history embeddings (fire-and-forget).
  if (req.body.status === 'completed') {
    (async () => {
      try {
        const activities = await HotelActivity.find({ event: event._id, outcome: 'selected' });
        for (const act of activities) {
          const bookingCount = await Booking.countDocuments({
            event: event._id,
            'inventory.hotel': act.hotel,
            status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
          });
          act.outcome = 'completed';
          act.bookingsCount = bookingCount;
          await act.save();
          await updateHotelActivityEmbedding(act.hotel);
        }
        console.log(`[HotelActivity] marked ${activities.length} activities completed for event ${event.name}`);
      } catch (err) {
        console.error('[HotelActivity] completion update failed:', err.message);
      }
    })();
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Regenerate embedding if event details changed
  const oldHash = event.embeddingHash;
  generateEventEmbedding(event)
    .then(async ({ vectorId, embeddingHash, embedding }) => {
      if (oldHash !== embeddingHash) {
        // Event details changed, update embedding
        await upsertVector('events_vectors', vectorId, embedding, {
          eventId: event._id.toString(),
          name: event.name,
          type: event.type,
          location: event.location?.city || '',
          country: event.location?.country || '',
          budgetMin: event.budgetRange?.min || event.budget || 0,
          budgetMax: event.budgetRange?.max || event.budget || 0,
          attendees: event.expectedGuests || 0,
          status: event.status,
        });
        
        await Event.findByIdAndUpdate(event._id, { vectorId, embeddingHash });
        console.log(`✅ Updated embedding for event: ${event.name}`);
      }
    })
    .catch(err => console.error(`❌ Failed to update embedding for event ${event._id}:`, err.message));

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
  const { slug } = req.params;
  console.log(`🔍 Fetching microsite for slug: ${slug}`);
  
  try {
    const event = await Event.findOne({
      'micrositeConfig.customSlug': slug,
      'micrositeConfig.isPublished': true,
    }).populate('planner', 'name organization');

    if (!event) {
      console.warn(`⚠️ Microsite not found or not published: ${slug}`);
      return res.status(404).json({
        success: false,
        message: 'Event microsite not found or not published',
      });
    }

    console.log(`✅ Microsite found: ${event.name}`);
    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('❌ Error fetching microsite:', error);
    throw error; // asyncHandler will handle this
  }
});

/**
 * @route   PUT /api/events/:id/approve
 * @desc    Approve event and publish microsite immediately with AI recommendations
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

  // Import recommendation service dynamically
  const { generateHotelRecommendations } = await import('../services/hotelRecommendationService.js');

  // Approve event - change status to rfp-published
  event.status = 'rfp-published';
  event.approvedBy = req.user.id;
  event.approvedAt = new Date();

  // NEW: Publish microsite immediately and grant access
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

  event.micrositeAccessGranted = true;
  event.micrositeAccessGrantedAt = new Date();

  await event.save();

  // Generate hotel recommendations
  try {
    const recommendations = await generateHotelRecommendations(event._id);
    event.recommendedHotels = recommendations;
    await event.save();
    console.log(`✅ Generated ${recommendations.length} hotel recommendations for ${event.name}`);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    // Don't fail approval if recommendations fail
  }

  // 🔥 NEW: Auto-generate embeddings for public events
  if (!event.isPrivate) {
    try {
      console.log(`🤖 Generating embeddings for approved event: ${event.name}`);
      const embeddingData = await generateEventEmbedding(event);
      
      await upsertVector('events_vectors', event._id.toString(), embeddingData.vector, {
        name: event.name,
        type: event.type,
        location: event.location?.city || '',
        country: event.location?.country || 'India',
        budgetMin: event.budgetRange?.min || event.budget || 0,
        budgetMax: event.budgetRange?.max || event.budget || 0,
        attendees: event.expectedGuests || 0,
        status: event.status,
      });
      
      console.log(`✅ Embeddings generated and stored for ${event.name}`);
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      // Don't fail approval if embeddings fail
    }
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_approve',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Event approved, microsite published, and recommendations generated: ${event.name}`,
  });

  try {
    const planner = await User.findById(event.planner).select('name email');
    if (planner?.email) {
      const micrositeUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/microsite/${event.micrositeConfig.customSlug}`;
      await sendEmail({
        to: planner.email,
        subject: `✅ Your event is approved - Microsite is live!`,
        html: `
          <p>Hi ${planner.name || 'Planner'},</p>
          <p>Great news! Your event <strong>${event.name}</strong> has been approved! 🎉</p>
          
          <h3>What's Next:</h3>
          <ul>
            <li>✅ Your event microsite is now live and accessible</li>
            <li>✅ RFP has been sent to all hotels</li>
            <li>✅ We've recommended hotels based on your requirements</li>
          </ul>
          
          <p><strong>Microsite URL:</strong> <a href="${micrositeUrl}">${micrositeUrl}</a></p>
          
          <p>You can now:</p>
          <ul>
            <li>Access your microsite and manage your event</li>
            <li>Review recommended hotels and select your preferred ones</li>
            <li>Monitor incoming proposals from hotels responding to your RFP</li>
          </ul>
          
          <p>Get started by clicking the "Manage Event" button in your dashboard!</p>
        `,
        text: `Your event ${event.name} has been approved! Your microsite is live at ${micrositeUrl}. Hotels have been notified and recommendations are ready.`,
      });
    }

    const hotels = await User.find({ role: 'hotel', isActive: true }).select('email name organization');
    const hotelEmails = hotels.map((hotel) => hotel.email).filter(Boolean);
    if (hotelEmails.length > 0) {
      await sendEmail({
        to: hotelEmails,
        subject: `New RFP available: ${event.name}`,
        html: `
          <p>Hello,</p>
          <p>A new event RFP is now available.</p>
          <ul>
            <li><strong>Event:</strong> ${event.name}</li>
            <li><strong>Type:</strong> ${event.type}</li>
            <li><strong>Dates:</strong> ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}</li>
            <li><strong>Location:</strong> ${event.location?.city || 'TBD'}</li>
          </ul>
          <p>Please log in to your hotel dashboard to review and submit your proposal.</p>
        `,
        text: `New RFP available: ${event.name}. Please log in to submit your proposal.`,
      });
    }
  } catch (error) {
    console.error('Error sending approval notification emails:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Event approved, microsite published, and recommendations generated',
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

/**
 * @route   POST /api/events/:id/comment
 * @desc    Add admin comment requesting changes
 * @access  Private (Admin only)
 */
export const addAdminComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  if (!comment || !comment.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment is required',
    });
  }

  // Add comment to event
  event.adminComments.push({
    comment: comment.trim(),
    commentedBy: req.user.id,
    commentedAt: new Date(),
    isRead: false,
  });

  await event.save();

  // Populate the comment with user details
  const populatedEvent = await Event.findById(event._id)
    .populate('adminComments.commentedBy', 'name email')
    .populate('planner', 'name email');

  // Send email notification to planner
  try {
    const planner = populatedEvent.planner;
    if (planner?.email) {
      await sendEmail({
        to: planner.email,
        subject: `Admin Feedback on Your Event: ${event.name}`,
        html: `
          <p>Hi ${planner.name || 'Planner'},</p>
          <p>The admin has provided feedback on your event proposal <strong>${event.name}</strong>.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
            <p><strong>Admin Comment:</strong></p>
            <p>${comment}</p>
          </div>
          <p>Please review the feedback and make the necessary changes to your event proposal.</p>
          <p>Thank you!</p>
        `,
        text: `Admin Feedback on ${event.name}: ${comment}`,
      });
    }
  } catch (error) {
    console.error('Error sending comment notification email:', error);
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_comment',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Admin added comment: ${comment.substring(0, 100)}`,
  });

  res.status(200).json({
    success: true,
    message: 'Comment added successfully',
    data: populatedEvent,
  });
});

/**
 * @route   POST /api/events/:id/comment/:commentId/reply
 * @desc    Planner replies to admin comment
 * @access  Private (Planner only)
 */
export const replyToAdminComment = asyncHandler(async (req, res) => {
  const { reply } = req.body;
  const { id: eventId, commentId } = req.params;
  
  const event = await Event.findById(eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Verify planner owns this event
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to reply to comments on this event',
    });
  }

  if (!reply || !reply.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Reply is required',
    });
  }

  // Find the comment and add reply
  const comment = event.adminComments.id(commentId);
  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
  }

  comment.replies.push({
    reply: reply.trim(),
    repliedBy: req.user.id,
    repliedAt: new Date(),
  });

  await event.save();

  // Populate the event with user details
  const populatedEvent = await Event.findById(event._id)
    .populate('adminComments.commentedBy', 'name email')
    .populate('adminComments.replies.repliedBy', 'name email')
    .populate('planner', 'name email');

  // Send email notification to admin who commented
  try {
    const adminUser = await User.findById(comment.commentedBy);
    if (adminUser?.email) {
      await sendEmail({
        to: adminUser.email,
        subject: `Planner Reply on Event: ${event.name}`,
        html: `
          <p>Hi ${adminUser.name || 'Admin'},</p>
          <p>The planner has replied to your feedback on event <strong>${event.name}</strong>.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
            <p><strong>Planner's Reply:</strong></p>
            <p>${reply}</p>
          </div>
          <p>Please review their response and take appropriate action.</p>
          <p>Thank you!</p>
        `,
        text: `Planner Reply on ${event.name}: ${reply}`,
      });
    }
  } catch (error) {
    console.error('Error sending reply notification email:', error);
  }

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'event_comment_reply',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Planner replied to admin comment: ${reply.substring(0, 100)}`,
  });

  res.status(200).json({
    success: true,
    message: 'Reply added successfully',
    data: populatedEvent,
  });
});

/**
 * @route   POST /api/events/:id/select-hotels
 * @desc    Planner selects hotels and calculates total cost for private event
 * @access  Private (Planner only)
 */
export const selectHotelsForEvent = asyncHandler(async (req, res) => {
  const { selectedHotelProposals } = req.body; // Array of proposal IDs

  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Verify planner owns this event
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to modify this event',
    });
  }

  if (!event.isPrivate) {
    return res.status(400).json({
      success: false,
      message: 'This endpoint is only for private events',
    });
  }

  // Import HotelProposal model
  const HotelProposal = (await import('../models/HotelProposal.js')).default;

  // Fetch selected proposals and calculate total cost
  const proposals = await HotelProposal.find({ _id: { $in: selectedHotelProposals } });

  if (proposals.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid proposals selected',
    });
  }

  // Calculate total cost for all selected hotels
  let totalCost = 0;
  const selectedHotels = [];

  for (const proposal of proposals) {
    // Calculate cost for this hotel (all room types × expected guests proportionally)
    const hotelCost = 
      (proposal.pricing.singleRoom?.pricePerNight || 0) * (proposal.pricing.singleRoom?.availableRooms || 0) +
      (proposal.pricing.doubleRoom?.pricePerNight || 0) * (proposal.pricing.doubleRoom?.availableRooms || 0) +
      (proposal.pricing.suite?.pricePerNight || 0) * (proposal.pricing.suite?.availableRooms || 0);

    totalCost += hotelCost;

    selectedHotels.push({
      hotel: proposal.hotel,
      proposal: proposal._id,
    });
  }

  // Update event with selected hotels and payment amount
  event.selectedHotels = selectedHotels;
  event.plannerPaymentAmount = totalCost;
  event.plannerPaymentStatus = 'pending';
  await event.save();

  console.log(`💰 Planner needs to pay ₹${totalCost} for ${selectedHotels.length} hotels`);

  res.status(200).json({
    success: true,
    message: 'Hotels selected successfully',
    data: {
      selectedHotels,
      totalAmount: totalCost,
      currency: 'INR',
    },
  });
});

/**
 * @route   POST /api/events/:id/planner-payment
 * @desc    Process planner payment for private event (after Razorpay verification)
 * @access  Private (Planner only)
 */
export const processPlannerPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Verify planner owns this event
  if (event.planner.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized',
    });
  }

  if (!event.isPrivate) {
    return res.status(400).json({
      success: false,
      message: 'Payment not required for public events',
    });
  }

  if (event.plannerPaymentStatus === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Payment already completed',
    });
  }

  // Update event with payment details
  event.plannerPaymentStatus = 'paid';
  event.plannerPaidAt = new Date();
  event.plannerPaymentDetails = {
    transactionId: razorpay_payment_id,
    paymentMethod: 'razorpay',
    paymentGateway: 'razorpay',
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  };

  // Mark all associated guest bookings as paid
  const updateResult = await Booking.updateMany(
    { 
      event: event._id, 
      isPaidByPlanner: true,
      paymentStatus: 'unpaid'  // Only update unpaid bookings
    },
    { 
      paymentStatus: 'paid',
      status: 'confirmed'  // Auto-confirm bookings when planner pays
    }
  );
  
  console.log(`💳 Updated ${updateResult.modifiedCount} bookings to 'paid' status`);
  
  // Change status to active so event shows in "Manage Events"
  event.status = 'active';
  console.log(`✅ Event status changed to "active" for: ${event.name}`);

  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'planner_payment',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Planner paid ₹${event.plannerPaymentAmount} for private event`,
  });

  console.log(`✅ Planner payment completed for event: ${event.name}`);

  // Notify all invited guests that the event is live and they can book hotels
  try {
    if (event.invitedGuests && event.invitedGuests.length > 0) {
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
      const slug = event.micrositeConfig?.customSlug;
      const micrositeLink = slug ? `${clientUrl}/microsite/${slug}` : clientUrl;

      await Promise.all(
        event.invitedGuests.map((guest) =>
          sendEmail({
            to: guest.email,
            subject: `Event is live – Book your hotel for ${event.name}`,
            html: `
              <p>Hi ${guest.name || 'Guest'},</p>
              <p>Great news! The private event <strong>${event.name}</strong> is now live and hotel bookings are open.</p>
              <p>Visit the event page and book your hotel room:</p>
              <p><a href="${micrositeLink}" style="display:inline-block;padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Book Now</a></p>
              <p>Or copy this link: <a href="${micrositeLink}">${micrositeLink}</a></p>
              <p>We look forward to seeing you there!</p>
            `,
            text: `The private event ${event.name} is now live. Book your hotel here: ${micrositeLink}`,
          })
        )
      );
      console.log(`📧 Sent booking invitation emails to ${event.invitedGuests.length} guests`);
    }
  } catch (error) {
    console.error('Error sending guest booking notification emails:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Payment processed successfully. Microsite is now published!',
    data: event,
  });
});
/**
 * @route   GET /api/events/:id/recommendations
 * @desc    Get AI-generated hotel recommendations for an event
 * @access  Private (Planner only)
 */
export const getHotelRecommendations = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('recommendedHotels.hotel', 'name email organization location totalRooms priceRange specialization');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if user is the planner
  if (event.planner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view recommendations for this event',
    });
  }

  res.status(200).json({
    success: true,
    count: event.recommendedHotels.length,
    data: event.recommendedHotels,
  });
});

/**
 * Helper: Generate estimated pricing for non-TBO hotels
 */
function generateEstimatedPricing(hotel, event) {
  const totalRooms = hotel.totalRooms || 50;
  const roomDistribution = {
    single: Math.floor(totalRooms * 0.4), // 40% single
    double: Math.floor(totalRooms * 0.5), // 50% double
    suite: Math.floor(totalRooms * 0.1),  // 10% suite
  };

  const avgPrice = hotel.priceRange?.min && hotel.priceRange?.max 
    ? (hotel.priceRange.min + hotel.priceRange.max) / 2 
    : 5000; // Default ₹5000/night

  return {
    singleRoom: {
      pricePerNight: Math.round(avgPrice * 0.8), // 80% of avg
      availableRooms: roomDistribution.single,
    },
    doubleRoom: {
      pricePerNight: Math.round(avgPrice), // Full avg price
      availableRooms: roomDistribution.double,
    },
    suite: {
      pricePerNight: Math.round(avgPrice * 1.5), // 150% of avg
      availableRooms: roomDistribution.suite,
    },
  };
}

/**
 * Helper: Extract facilities from hotel profile
 */
function extractFacilities(hotel, event) {
  // Check if facilities is an array (new format) or object (old format)
  const hotelFacilities = hotel.facilities || [];
  const facilitiesArray = Array.isArray(hotelFacilities) ? hotelFacilities : [];
  
  return {
    wifi: facilitiesArray.includes('wifi') || true, // Assume wifi always available
    parking: facilitiesArray.includes('parking') || true,
    breakfast: facilitiesArray.includes('breakfast') || false,
    gym: facilitiesArray.includes('gym') || false,
    pool: facilitiesArray.includes('pool') || false,
    spa: facilitiesArray.includes('spa') || false,
    restaurant: facilitiesArray.includes('restaurant') || true,
    conferenceRoom: facilitiesArray.includes('conferenceRoom') || (event.type === 'conference'),
    airportShuttle: facilitiesArray.includes('airportShuttle') || false,
    laundry: facilitiesArray.includes('laundry') || true,
  };
}

/**
 * @route   POST /api/events/:id/select-recommended-hotel
 * @desc    Select a recommended hotel (creates a HotelProposal from AI recommendation)
 * @access  Private (Planner only)
 */
export const selectRecommendedHotel = asyncHandler(async (req, res) => {
  const { hotelId } = req.body;
  const event = await Event.findById(req.params.id);

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
      message: 'Not authorized to select hotels for this event',
    });
  }

  // Validate that the hotel exists and is active
  const hotel = await User.findOne({
    _id: hotelId,
    role: 'hotel',
    isActive: true,
  });

  if (!hotel) {
    return res.status(404).json({
      success: false,
      message: 'Hotel not found or not active',
    });
  }

  console.log('✅ Hotel validated:', hotel.name || hotel.organization);

  // Import HotelProposal model
  const HotelProposal = (await import('../models/HotelProposal.js')).default;

  // Check if a proposal already exists for this hotel and event
  let proposal = await HotelProposal.findOne({
    event: event._id,
    hotel: hotelId,
  });

  if (proposal) {
    console.log('✅ Existing proposal found, marking as selected');
    proposal.selectedByPlanner = true;
    proposal.status = 'selected';
    proposal.selectionDate = new Date();
    await proposal.save();
  } else {
    // Create a new HotelProposal from hotel's profile data
    console.log('🆕 Creating new proposal from AI recommendation');

    // Check if this is a TBO hotel
    const isTBOHotel = hotel.hotelSource === 'tbo' && hotel.tboData?.hotelCode;
    let pricing, tboMetadata;

    if (isTBOHotel) {
      console.log('🔍 TBO Hotel detected, fetching real-time pricing...');
      
      try {
        // Calculate check-in and check-out dates
        const checkInDate = event.startDate 
          ? new Date(event.startDate).toISOString().split('T')[0]
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
        
        const checkOutDate = event.endDate
          ? new Date(event.endDate).toISOString().split('T')[0]
          : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 10 days from now

        // Default room configuration (can be customized based on event)
        const rooms = [{ adults: 2, children: 0 }];

        // Call TBO Search API
        const searchResponse = await tboService.searchHotels({
          hotelCodes: [hotel.tboData.hotelCode],
          checkInDate,
          checkOutDate,
          rooms,
        });

        if (searchResponse && searchResponse.HotelResult && searchResponse.HotelResult.length > 0) {
          // Parse the search results
          const parsedResults = tboSearchService.parseSearchResponse(searchResponse);
          
          if (parsedResults.length > 0) {
            const pricingData = tboSearchService.transformToPricingData(parsedResults[0]);
            pricing = pricingData.pricing;
            tboMetadata = pricingData.metadata;
            
            console.log('✅ Real-time TBO pricing fetched successfully');
          } else {
            console.warn('⚠️ No pricing data in TBO response, using estimated pricing');
            pricing = generateEstimatedPricing(hotel, event);
          }
        } else {
          console.warn('⚠️ TBO Search returned no results, using estimated pricing');
          pricing = generateEstimatedPricing(hotel, event);
        }
      } catch (tboError) {
        console.error('❌ TBO Search API error:', tboError.message);
        console.log('⚠️ Falling back to estimated pricing');
        pricing = generateEstimatedPricing(hotel, event);
      }
    } else {
      // Non-TBO hotel: use estimated pricing
      pricing = generateEstimatedPricing(hotel, event);
    }

    // Extract facilities from hotel profile
    const facilities = extractFacilities(hotel, event);

    // Calculate estimated cost
    const nights = event.startDate && event.endDate 
      ? Math.ceil((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24))
      : 3; // Default 3 nights

    const estimatedRoomsNeeded = event.expectedGuests 
      ? Math.ceil(event.expectedGuests / 2) // Assume 2 guests per room
      : 30;

    // Calculate total cost based on available room types
    let avgRoomPrice = 0;
    let roomCount = 0;
    if (pricing.singleRoom?.pricePerNight) {
      avgRoomPrice += pricing.singleRoom.pricePerNight;
      roomCount++;
    }
    if (pricing.doubleRoom?.pricePerNight) {
      avgRoomPrice += pricing.doubleRoom.pricePerNight;
      roomCount++;
    }
    if (pricing.suite?.pricePerNight) {
      avgRoomPrice += pricing.suite.pricePerNight;
      roomCount++;
    }
    avgRoomPrice = roomCount > 0 ? avgRoomPrice / roomCount : 5000; // Default ₹5000

    const totalEstimatedCost = Math.round(avgRoomPrice * nights * estimatedRoomsNeeded);

    const proposalData = {
      event: event._id,
      hotel: hotelId,
      hotelName: hotel.name || hotel.organization,
      pricing,
      totalRoomsOffered: hotel.totalRooms || 50,
      amenities: hotel.amenities || [],
      facilities,
      additionalServices: {
        transportation: {
          available: false,
          cost: 0,
          description: '',
        },
        catering: {
          available: event.type === 'conference' || event.type === 'corporate',
          costPerPerson: 50,
          description: 'Full catering service available',
        },
        avEquipment: {
          available: event.type === 'conference',
          cost: 500,
          description: 'Audio-visual equipment for conferences',
        },
        other: '',
      },
      specialOffer: isTBOHotel 
        ? 'Real-time pricing from TBO - Best match for your event!'
        : 'Selected from AI recommendations - Best match for your event!',
      notes: `Auto-generated proposal from AI recommendation. Hotel: ${hotel.location?.city || 'N/A'}, ${hotel.location?.country || 'N/A'}`,
      totalEstimatedCost,
      status: 'selected',
      selectedByPlanner: true,
      selectionDate: new Date(),
    };

    // Add TBO metadata if available
    if (tboMetadata) {
      proposalData.tboMetadata = tboMetadata;
    }

    proposal = await HotelProposal.create(proposalData);

    console.log('✅ Created new proposal:', proposal._id);
  }

  // Check if hotel is in rule-based recommendations and mark it as selected
  const recHotel = event.recommendedHotels.find(
    (h) => h.hotel.toString() === hotelId
  );

  if (recHotel) {
    recHotel.isSelectedByPlanner = true;
    console.log('📌 Marked hotel as selected in recommendedHotels');
  } else {
    // Hotel is from AI recommendations, add it to recommendedHotels
    event.recommendedHotels.push({
      hotel: hotelId,
      score: 0,
      reasons: ['Selected from AI recommendations'],
      isSelectedByPlanner: true,
    });
    console.log('🤖 Added AI-recommended hotel to recommendedHotels');
  }

  // Add to selectedHotels with proposal reference
  const alreadySelected = event.selectedHotels.some(
    (sh) => sh.hotel?.toString() === hotelId
  );

  if (!alreadySelected) {
    event.selectedHotels.push({
      hotel: hotelId,
      proposal: proposal._id, // Link to the HotelProposal
    });
    console.log('✅ Added hotel to selectedHotels with proposal reference');
  } else {
    // Update existing entry with proposal reference
    const existingSelection = event.selectedHotels.find(
      (sh) => sh.hotel?.toString() === hotelId
    );
    if (existingSelection) {
      existingSelection.proposal = proposal._id;
      console.log('✅ Updated existing selectedHotel with proposal reference');
    }
  }

  // For public events, auto-activate when at least one hotel is selected
  if (!event.isPrivate && event.selectedHotels.length > 0) {
    if (event.status === 'reviewing-proposals' || event.status === 'pending-approval' || event.status === 'rfp-published') {
      event.status = 'active';
      console.log('🎉 Auto-activated public event');
      
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
        console.log('🌐 Auto-published microsite:', event.micrositeConfig.customSlug);
      }
    }
  }

  await event.save();

  // Log action
  await createAuditLog({
    user: req.user.id,
    action: 'hotel_select_recommended',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Selected recommended hotel (${hotel.name || hotel.organization}) for event: ${event.name}. Created proposal: ${proposal._id}`,
  });

  res.status(200).json({
    success: true,
    message: 'Hotel selected successfully and proposal created',
    data: {
      event,
      proposal,
    },
  });
});

/**
 * @route   GET /api/events/:id/microsite-proposals
 * @desc    Get all data for microsite hotel management (AI recommendations + RFP proposals)
 * @access  Private (Planner only)
 */
export const getMicrositeProposals = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('recommendedHotels.hotel', 'name email organization location totalRooms priceRange specialization');

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if user is the planner
  if (event.planner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this event data',
    });
  }

  // Import HotelProposal model
  const HotelProposal = (await import('../models/HotelProposal.js')).default;

  // Get all RFP proposals for this event
  const rfpProposals = await HotelProposal.find({ event: req.params.id })
    .populate('hotel', 'name email organization');

  // Get AI-powered hotel recommendations
  let aiRecommendations = [];
  try {
    console.log('🤖 Fetching AI recommendations for event:', req.params.id);
    const { getHotelRecommendationsLogic } = await import('../controllers/recommendationController.js');
    aiRecommendations = await getHotelRecommendationsLogic(req.params.id, req.user._id, 10);
    console.log('✅ AI recommendations fetched:', aiRecommendations.length);
    
    // Mark recommendations as selected if they're in selectedHotels
    const selectedHotelIds = event.selectedHotels.map(sh => sh.hotel?.toString()).filter(Boolean);
    aiRecommendations = aiRecommendations.map(rec => ({
      ...rec,
      isSelectedByPlanner: selectedHotelIds.includes(rec.hotel._id.toString())
    }));
    console.log('✅ Marked selected hotels in AI recommendations');
  } catch (error) {
    console.error('❌ Error fetching AI recommendations:', error.message);
    // Fallback to rule-based recommendations if AI fails
    console.log('🔄 Falling back to rule-based recommendations');
    aiRecommendations = event.recommendedHotels.map(rec => ({
      hotel: rec.hotel,
      score: rec.score,
      breakdown: { total: rec.score },
      reasons: rec.reasons || [],
      isSelectedByPlanner: rec.isSelectedByPlanner
    }));
    console.log('📊 Rule-based recommendations:', aiRecommendations.length);
  }

  // Get selected hotels from recommendations
  const selectedRecommendedHotels = event.recommendedHotels
    .filter((h) => h.isSelectedByPlanner)
    .map((h) => h.hotel);

  res.status(200).json({
    success: true,
    data: {
      recommendations: aiRecommendations, // Use AI recommendations
      rfpProposals,
      selectedRecommended: selectedRecommendedHotels,
      selectedHotels: event.selectedHotels,
    },
  });
});

/**
 * @route   PUT /api/events/:id/activate
 * @desc    Activate event if it has selected hotels (utility for fixing stuck events)
 * @access  Private (Planner/Admin)
 */
export const activateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check authorization
  if (event.planner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to activate this event',
    });
  }

  // Check if event has selected hotels
  if (!event.selectedHotels || event.selectedHotels.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot activate event without selected hotels',
    });
  }

  // For private events, require payment
  if (event.isPrivate && event.plannerPaymentStatus !== 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Private events require payment before activation',
    });
  }

  // Update status to active
  event.status = 'active';

  // Ensure microsite is published
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

  await event.save();

  // Generate embedding for public events
  if (!event.isPrivate) {
    try {
      const embeddingData = await generateEventEmbedding(event);
      if (embeddingData && embeddingData.vector) {
        await upsertVector('events_vectors', event._id.toString(), embeddingData.vector, {
          name: event.name,
          type: event.type,
          location: event.location?.city || '',
          country: event.location?.country || '',
          budgetMin: event.budgetRange?.min || event.budget || 0,
          budgetMax: event.budgetRange?.max || event.budget || 0,
          attendees: event.expectedGuests || 0,
          status: event.status,
        });
        console.log(`✅ Event embedding generated for: ${event.name}`);
      }
    } catch (error) {
      console.error('⚠️ Failed to generate embedding:', error.message);
    }
  }

  await createAuditLog({
    user: req.user.id,
    action: 'event_update',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
    details: `Event activated: ${event.name}`,
  });

  res.status(200).json({
    success: true,
    message: 'Event activated successfully',
    data: event,
  });
});