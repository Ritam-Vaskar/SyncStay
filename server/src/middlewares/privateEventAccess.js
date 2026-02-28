import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Middleware to check if user has access to a private event
 * For private events: user must be in the invitedGuests list
 * For public events: anyone can access
 */
export const checkPrivateEventAccess = asyncHandler(async (req, res, next) => {
  const { slug, eventId } = req.params;
  const userEmail = req.user?.email;

  // Find event by slug or eventId
  let event;
  if (slug) {
    event = await Event.findOne({ 'micrositeConfig.customSlug': slug }).select(
      'isPrivate invitedGuests name planner micrositeConfig plannerPaymentStatus'
    );
  } else if (eventId) {
    event = await Event.findById(eventId).select(
      'isPrivate invitedGuests name planner micrositeConfig plannerPaymentStatus'
    );
  }

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found',
    });
  }

  // Check if microsite is published
  if (!event.micrositeConfig?.isPublished) {
    return res.status(403).json({
      success: false,
      message: 'This event microsite is not yet published',
    });
  }

  // For private events, allow access even before planner payment
  // Flow: Microsite published → Guests book → Planner pays → Event confirmed

  // If event is public, allow access
  if (!event.isPrivate) {
    req.event = event;
    return next();
  }

  // For private events, allow VIEWING for everyone
  // We'll check booking permission at the booking endpoint, not here
  // This allows anyone to see the microsite but only invited guests can book
  
  // If user is authenticated, store their info for later checks
  if (userEmail) {
    // Check if user is the planner
    if (event.planner.toString() === req.user.id) {
      req.event = event;
      req.isPlanner = true;
      return next();
    }

    // Check if user is in invited guests list
    const isInvited = event.invitedGuests.some(
      (guest) => guest.email.toLowerCase() === userEmail.toLowerCase()
    );

    if (isInvited) {
      req.isInvitedGuest = true;
    }
  }

  // Allow viewing for everyone (authenticated or not)
  req.event = event;
  next();
});
