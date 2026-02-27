import express from 'express';
import {
  getOverview,
  getEventAnalytics,
  getRevenueAnalytics,
  getAuditLogs,
  getAdminDashboard,
  getEventActivityLogs,
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateMongoId, validateEventId } from '../middlewares/validators.js';

const router = express.Router();

router.use(protect);

router.get('/overview', authorize('admin'), getOverview);
router.get('/admin/dashboard', authorize('admin'), getAdminDashboard);
router.get('/event/:eventId', authorize('planner', 'admin'), validateEventId, getEventAnalytics);
router.get('/events/:eventId/activity-logs', authorize('planner', 'admin'), validateEventId, getEventActivityLogs);
router.get('/revenue', authorize('admin', 'planner'), getRevenueAnalytics);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

export default router;
