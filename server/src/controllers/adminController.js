import User from '../models/User.js';
import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (via JSON)
 * @access  Private (Admin)
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, organization, address, hotelDetails } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      message: 'Please provide name, email, password, and role' 
    });
  }

  // Validate role
  const validRoles = ['guest', 'planner', 'hotel', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      message: 'Invalid role. Must be one of: guest, planner, hotel, admin' 
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ 
      message: 'User with this email already exists' 
    });
  }

  // Create user object (password will be hashed by pre-save hook)
  const userData = {
    name,
    email,
    password,
    role,
    isActive: true,
  };

  // Add optional fields
  if (phone) userData.phone = phone;
  if (organization) userData.organization = organization;
  if (address) userData.address = address;
  
  // Add hotel-specific details
  if (hotelDetails) {
    if (hotelDetails.starRating) userData.tboData = { starRating: hotelDetails.starRating };
    if (hotelDetails.totalRooms) userData.totalRooms = hotelDetails.totalRooms;
    if (hotelDetails.amenities) userData.facilities = hotelDetails.amenities;
    if (hotelDetails.description) userData.description = hotelDetails.description;
  }

  // Create user
  const user = await User.create(userData);

  res.status(201).json({
    message: 'User created successfully',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters and pagination
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search, status } = req.query;

  // Build query
  let query = {};
  
  if (role && role !== 'all') {
    query.role = role;
  }
  
  if (status) {
    query.isActive = status === 'active';
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { organization: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  // Get users with populated data
  const users = await User.find(query)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Get additional stats for each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      let stats = {};
      
      if (user.role === 'planner') {
        const eventsCount = await Event.countDocuments({ planner: user._id });
        const activeEvents = await Event.countDocuments({ planner: user._id, status: 'active' });
        stats = { eventsCount, activeEvents };
      } else if (user.role === 'hotel') {
        const proposalsCount = await Event.countDocuments({ 'selectedHotels': user._id });
        stats = { proposalsCount };
      } else if (user.role === 'guest') {
        const bookingsCount = await Booking.countDocuments({ user: user._id });
        stats = { bookingsCount };
      }
      
      return { ...user, stats };
    })
  );

  const total = await User.countDocuments(query);

  res.status(200).json({
    users: usersWithStats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get single user details
 * @access  Private (Admin)
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Get additional details based on role
  let additionalData = {};
  
  if (user.role === 'planner') {
    const events = await Event.find({ planner: user._id })
      .select('name status startDate endDate')
      .limit(10)
      .sort({ createdAt: -1 });
    additionalData.recentEvents = events;
  } else if (user.role === 'hotel') {
    const proposals = await Event.find({ 'selectedHotels': user._id })
      .select('name startDate endDate')
      .limit(10)
      .sort({ createdAt: -1 });
    additionalData.recentProposals = proposals;
  } else if (user.role === 'guest') {
    const bookings = await Booking.find({ user: user._id })
      .populate('event', 'name')
      .select('status checkIn checkOut')
      .limit(10)
      .sort({ createdAt: -1 });
    additionalData.recentBookings = bookings;
  }

  res.status(200).json({
    user,
    ...additionalData,
  });
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details
 * @access  Private (Admin)
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive, organization, phone } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Update fields
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (organization !== undefined) user.organization = organization;
  if (phone !== undefined) user.phone = phone;

  await user.save();

  res.status(200).json({
    message: 'User updated successfully',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent deleting the last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin user' });
    }
  }

  await user.deleteOne();

  res.status(200).json({
    message: 'User deleted successfully',
  });
});

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Private (Admin)
 */
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findById(req.params.id).select('+password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.status(200).json({
    message: 'Password reset successfully',
  });
});

/**
 * @route   GET /api/admin/users/stats/overview
 * @desc    Get user statistics overview
 * @access  Private (Admin)
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  
  // Count by role
  const roleStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  // Recent registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRegistrations = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
  });

  // Registration trend (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const registrationTrend = await User.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    roleStats: roleStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    recentRegistrations,
    registrationTrend,
  });
});
