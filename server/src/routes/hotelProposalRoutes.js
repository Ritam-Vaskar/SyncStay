import express from 'express';
import {
  getRFPs,
  submitProposal,
  getMyProposals,
  getEventProposals,
  selectProposal,
  confirmHotelSelection,
  publishEventMicrosite,
  updateProposal,
  getSelectedProposalsForMicrosite,
} from '../controllers/hotelProposalController.js';
import { protect, authorize, optionalAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public routes with optional auth (must be before protected routes)
router.get('/microsite/:slug/selected', optionalAuth, getSelectedProposalsForMicrosite);

// Hotel routes
router.get('/rfps', protect, authorize('hotel'), getRFPs);
router.post('/', protect, authorize('hotel'), submitProposal);
router.get('/my-proposals', protect, authorize('hotel'), getMyProposals);
router.put('/:proposalId/update', protect, authorize('hotel'), updateProposal);

// Planner routes
router.get('/event/:eventId', protect, authorize('planner'), getEventProposals);
router.put('/:proposalId/select', protect, authorize('planner'), selectProposal);
router.post('/event/:eventId/confirm-selection', protect, authorize('planner'), confirmHotelSelection);
router.put('/event/:eventId/publish-microsite', protect, authorize('planner'), publishEventMicrosite);

export default router;
