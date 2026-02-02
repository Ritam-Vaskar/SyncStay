import express from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventBySlug,
} from '../controllers/eventController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateEvent, validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

// Public route for microsite
router.get('/microsite/:slug', getEventBySlug);

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
