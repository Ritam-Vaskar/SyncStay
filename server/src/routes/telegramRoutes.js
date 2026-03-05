import { Router } from 'express';
import { handleWebhook, getStatus } from '../controllers/telegramController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

// Telegram webhook endpoint (no auth — Telegram sends updates here)
router.post('/webhook', handleWebhook);

// Status check (admin only)
router.get('/status', protect, authorize('admin'), getStatus);

export default router;
