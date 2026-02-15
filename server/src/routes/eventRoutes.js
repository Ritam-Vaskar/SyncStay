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
  selectHotelsForEvent,
  processPlannerPayment,
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

// Private event - Hotel selection and planner payment
router.post('/:id/select-hotels', authorize('planner'), validateMongoId, selectHotelsForEvent);
router.post('/:id/planner-payment', authorize('planner'), validateMongoId, processPlannerPayment);

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
