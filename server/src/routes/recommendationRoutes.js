import express from 'express';
import {
  getUserRecommendations,
  getHotelRecommendationsForEvent,
} from '../controllers/recommendationController.js';
import { isAuthenticated, isPlannerOrAdmin } from '../middlewares/auth.js';

const router = express.Router();

// User recommendations (homepage)
router.get('/user', isAuthenticated, getUserRecommendations);

// Hotel recommendations for event (planner)
router.get('/hotels/:eventId', isAuthenticated, isPlannerOrAdmin, getHotelRecommendationsForEvent);

export default router;
