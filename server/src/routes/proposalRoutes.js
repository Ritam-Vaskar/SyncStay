import express from 'express';
import {
  getProposals,
  getProposal,
  createProposal,
  updateProposal,
  reviewProposal,
  deleteProposal,
} from '../controllers/proposalController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getProposals)
  .post(
    authorize('hotel', 'admin'),
    auditLogger('proposal_submit', 'Proposal'),
    createProposal
  );

router
  .route('/:id')
  .get(validateMongoId, getProposal)
  .put(
    authorize('hotel', 'admin'),
    validateMongoId,
    updateProposal
  )
  .delete(
    authorize('hotel', 'admin'),
    validateMongoId,
    deleteProposal
  );

router.put(
  '/:id/review',
  authorize('planner', 'admin'),
  validateMongoId,
  auditLogger('proposal_review', 'Proposal'),
  reviewProposal
);

export default router;
