import express from 'express';
import {
  getPayments,
  getPayment,
  processPayment,
  refundPayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getPayments)
  .post(
    auditLogger('payment_process', 'Payment'),
    processPayment
  );

router
  .route('/:id')
  .get(validateMongoId, getPayment);

router.post(
  '/:id/refund',
  authorize('admin'),
  validateMongoId,
  auditLogger('payment_refund', 'Payment'),
  refundPayment
);

export default router;
