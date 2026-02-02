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
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateInventory, validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

// Public/Protected route for available inventory
router.get('/event/:eventId/available', getAvailableInventory);

// All other routes require authentication
router.use(protect);

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
