import express from 'express';
import {
  getInventory,
  getInventoryById,
  getAvailableInventory,
  createInventory,
  updateInventory,
  lockInventory,
  releaseInventory,
  deleteInventory,
  autoGenerateGroups,
  createGroup,
  getEventGroups,
  assignGuestsToGroup,
  removeGuestFromGroup,
  deleteGroup,
  getEventRecommendations,
  getGuestHistory,
  updateGroupMetadata,
  assignHotelToGroup,
  getNearbyHotels,
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateInventory, validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

// Public/Protected route for available inventory
router.get('/event/:eventId/available', getAvailableInventory);

// All other routes require authentication
router.use(protect);

// Group management routes (must come before generic /:id routes to avoid conflicts)
router.post(
  '/:eventId/groups/auto-generate',
  authorize('planner'),
  autoGenerateGroups
);

router
  .route('/:eventId/groups')
  .post(
    authorize('planner'),
    createGroup
  )
  .get(
    authorize('planner'),
    getEventGroups
  );

router.put(
  '/:groupId/guests/assign',
  authorize('planner'),
  assignGuestsToGroup
);

router.delete(
  '/:groupId/guests/remove',
  authorize('planner'),
  removeGuestFromGroup
);

router.delete(
  '/:groupId',
  authorize('planner'),
  deleteGroup
);

router.put(
  '/:groupId/metadata',
  authorize('planner'),
  updateGroupMetadata
);

// Hotel assignment & nearby hotels routes (before generic /:id)
router.put(
  '/:groupId/assign-hotel',
  authorize('planner'),
  assignHotelToGroup
);

router.get(
  '/:eventId/nearby-hotels',
  authorize('planner'),
  getNearbyHotels
);

// Recommendations routes
router.get(
  '/:eventId/recommendations',
  authorize('planner'),
  getEventRecommendations
);

router.get(
  '/guest/:guestEmail/history',
  authorize('planner'),
  getGuestHistory
);

// Generic inventory routes (defined after group routes)
router
  .route('/')
  .get(getInventory)
  .post(
    authorize('hotel', 'planner', 'admin'),
    validateInventory,
    auditLogger('inventory_create', 'Inventory'),
    createInventory
  );

router
  .route('/:id')
  .get(validateMongoId, getInventoryById)
  .put(
    authorize('hotel', 'planner', 'admin'),
    validateMongoId,
    auditLogger('inventory_update', 'Inventory'),
    updateInventory
  )
  .delete(
    authorize('hotel', 'admin'),
    validateMongoId,
    deleteInventory
  );

router.put(
  '/:id/lock',
  authorize('planner', 'admin'),
  validateMongoId,
  auditLogger('inventory_lock', 'Inventory'),
  lockInventory
);

router.put(
  '/:id/release',
  authorize('planner', 'admin'),
  validateMongoId,
  auditLogger('inventory_release', 'Inventory'),
  releaseInventory
);

export default router;
