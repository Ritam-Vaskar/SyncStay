import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { queryAgent } from '../controllers/agentController.js';

const router = Router();

router.post('/query', protect, queryAgent);

export default router;
