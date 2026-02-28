import User from '../models/User.js';
import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateToken, generateRefreshToken } from '../utils/tokenUtils.js';
import { createAuditLog } from '../middlewares/auditLogger.js';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, organization } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email',
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'guest',
    phone,
    organization,
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Log action
  await createAuditLog({
    user: user._id,
    action: 'user_register',
    resource: 'User',
    resourceId: user._id,
    status: 'success',
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated',
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Log action
  await createAuditLog({
    user: user._id,
    action: 'user_login',
    resource: 'User',
    resourceId: user._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  const user = await User.findById(req.user.id);
  user.refreshToken = null;
  await user.save();

  // Log action
  await createAuditLog({
    user: user._id,
    action: 'user_logout',
    resource: 'User',
    resourceId: user._id,
    status: 'success',
  });

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * @route   GET /api/auth/guest-invite/:token
 * @desc    Auto-login guest using invitation token
 * @access  Public
 */
export const guestInviteLogin = asyncHandler(async (req, res) => {
  const { token } = req.params;

  // Find event with this invitation token
  const event = await Event.findOne({
    'invitedGuests.invitationToken': token,
  });

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Invalid or expired invitation link',
    });
  }

  // Find the specific guest
  const guest = event.invitedGuests.find(g => g.invitationToken === token);

  if (!guest) {
    return res.status(404).json({
      success: false,
      message: 'Guest not found',
    });
  }

  // Check if token is expired
  if (guest.tokenExpiry && new Date() > new Date(guest.tokenExpiry)) {
    return res.status(400).json({
      success: false,
      message: 'Invitation link has expired',
    });
  }

  // Check if user already exists
  let user = await User.findOne({ email: guest.email });

  if (!user) {
    // Create new guest user account (no password required for auto-created accounts)
    user = await User.create({
      name: guest.name,
      email: guest.email,
      phone: guest.phone || '',
      role: 'guest',
      password: Math.random().toString(36).slice(-8) + 'Aa1!', // Random password they won't need
      isActive: true,
    });

    await createAuditLog({
      user: user._id,
      action: 'guest_auto_register',
      resource: 'User',
      resourceId: user._id,
      status: 'success',
      details: { eventId: event._id, eventName: event.name },
    });
  }

  // Mark guest as having accessed
  if (!guest.hasAccessed) {
    guest.hasAccessed = true;
    await event.save();
  }

  // Update user's last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const authToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Save refresh token
  user.refreshToken = refreshToken;
  await user.save();

  // Log action
  await createAuditLog({
    user: user._id,
    action: 'guest_invite_login',
    resource: 'Event',
    resourceId: event._id,
    status: 'success',
  });

  // Return user data, tokens, and microsite link
  const micrositeSlug = event.micrositeConfig?.customSlug;
  
  res.status(200).json({
    success: true,
    message: 'Welcome! You have been automatically signed in.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: authToken,
      refreshToken,
      event: {
        id: event._id,
        name: event.name,
        micrositeSlug,
      },
    },
  });
});
