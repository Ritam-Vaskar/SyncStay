import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  guestInviteLogin,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validateRegister, validateLogin } from '../middlewares/validators.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Public route for guest invitation auto-login
router.get('/guest-invite/:token', guestInviteLogin);

export default router;
