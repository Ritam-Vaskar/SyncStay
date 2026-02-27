import express from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserStats,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateMongoId } from '../middlewares/validators.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// User statistics
router.get('/users/stats/overview', getUserStats);

// User management
router.post('/users', createUser);
router.get('/users', getAllUsers);
router.get('/users/:id', validateMongoId, getUserById);
router.put('/users/:id', validateMongoId, updateUser);
router.delete('/users/:id', validateMongoId, deleteUser);
router.post('/users/:id/reset-password', validateMongoId, resetUserPassword);

export default router;
