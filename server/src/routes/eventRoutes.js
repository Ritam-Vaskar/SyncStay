import express from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventBySlug,
  approveEvent,
  rejectEvent,
  addAdminComment,
  replyToAdminComment,
  selectHotelsForEvent,
  processPlannerPayment,
  getHotelRecommendations,
  selectRecommendedHotel,
  getMicrositeProposals,
  activateEvent,
} from '../controllers/eventController.js';
import { protect, authorize, optionalAuth } from '../middlewares/auth.js';
import { validateEvent, validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';
import { checkPrivateEventAccess } from '../middlewares/privateEventAccess.js';

const router = express.Router();

// Public route for microsite - use optionalAuth to allow both authenticated and unauthenticated access
router.get('/microsite/:slug', optionalAuth, checkPrivateEventAccess, getEventBySlug);

// Protected routes
router.use(protect);

router
  .route('/')
  .get(getEvents)
  .post(
    authorize('planner', 'admin'),
    validateEvent,
    auditLogger('event_create', 'Event'),
    createEvent
  );

// Admin approval routes
router.put('/:id/approve', authorize('admin'), validateMongoId, auditLogger('event_approve', 'Event'), approveEvent);
router.put('/:id/reject', authorize('admin'), validateMongoId, auditLogger('event_reject', 'Event'), rejectEvent);
router.post('/:id/comment', authorize('admin'), validateMongoId, auditLogger('event_comment', 'Event'), addAdminComment);
router.post('/:id/comment/:commentId/reply', authorize('planner'), validateMongoId, auditLogger('event_comment_reply', 'Event'), replyToAdminComment);

// Activate event (utility for fixing stuck events)
router.put('/:id/activate', authorize('planner', 'admin'), validateMongoId, auditLogger('event_update', 'Event'), activateEvent);

// Private event - Hotel selection and planner payment
router.post('/:id/select-hotels', authorize('planner'), validateMongoId, selectHotelsForEvent);
router.post('/:id/planner-payment', authorize('planner'), validateMongoId, processPlannerPayment);

// Hotel recommendations and selection
router.get('/:id/recommendations', authorize('planner', 'admin'), validateMongoId, getHotelRecommendations);
router.post('/:id/select-recommended-hotel', authorize('planner'), validateMongoId, selectRecommendedHotel);
router.get('/:id/microsite-proposals', authorize('planner', 'admin'), validateMongoId, getMicrositeProposals);

router
  .route('/:id')
  .get(validateMongoId, getEvent)
  .put(
    authorize('planner', 'admin'),
    validateMongoId,
    auditLogger('event_update', 'Event'),
    updateEvent
  )
  .delete(
    authorize('planner', 'admin'),
    validateMongoId,
    auditLogger('event_delete', 'Event'),
    deleteEvent
  );

export default router;
