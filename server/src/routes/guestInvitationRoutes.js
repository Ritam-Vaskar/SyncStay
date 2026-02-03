import express from 'express';
import {
  addGuests,
  uploadGuestList,
  getGuestList,
  removeGuest,
  verifyGuestAccess,
  toggleEventPrivacy,
} from '../controllers/guestInvitationController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public route for verifying guest access
router.post('/verify-access', verifyGuestAccess);

// Protected routes (Planner only)
router.post('/:eventId/guests', protect, authorize('planner'), addGuests);
router.post('/:eventId/guests/upload', protect, authorize('planner'), uploadGuestList);
router.get('/:eventId/guests', protect, authorize('planner'), getGuestList);
router.delete('/:eventId/guests/:guestId', protect, authorize('planner'), removeGuest);
router.patch('/:eventId/privacy', protect, authorize('planner'), toggleEventPrivacy);

export default router;
