import express from 'express';
import {
  trackSearch,
  trackView,
  trackBookmark,
  trackBooking,
  getUserActivity,
} from '../controllers/userActivityController.js';
import { isAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Track activities
router.post('/search', trackSearch);
router.post('/view', trackView);
router.post('/bookmark', trackBookmark);
router.post('/booking', trackBooking);

// Get user activity history
router.get('/history', getUserActivity);

export default router;
