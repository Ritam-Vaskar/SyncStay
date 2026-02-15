import express from 'express';
import {
  getPayments,
  getPayment,
  processPayment,
  refundPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validateMongoId } from '../middlewares/validators.js';
import { auditLogger } from '../middlewares/auditLogger.js';

const router = express.Router();

// Public Razorpay routes (no auth required for payment gateway)
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);

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
