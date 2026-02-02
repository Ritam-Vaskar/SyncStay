import express from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  confirmBooking,
  cancelBooking,
  approveBooking,
  rejectBooking,
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateBooking, validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getBookings)
  .post(
    validateBooking,
    auditLogger('booking_create', 'Booking'),
    createBooking
  );

router
  .route('/:id')
  .get(validateMongoId, getBooking);

router.put(
  '/:id/confirm',
  authorize('planner', 'hotel', 'admin'),
  validateMongoId,
  confirmBooking
);

router.put(
  '/:id/approve',
  authorize('planner'),
  validateMongoId,
  approveBooking
);

router.put(
  '/:id/reject',
  authorize('planner'),
  validateMongoId,
  rejectBooking
);

router.put(
  '/:id/cancel',
  validateMongoId,
  auditLogger('booking_cancel', 'Booking'),
  cancelBooking
);

export default router;
