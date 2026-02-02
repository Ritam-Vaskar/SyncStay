import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * User Registration Validation
 */
export const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'planner', 'hotel', 'guest'])
    .withMessage('Invalid role'),
  validate,
];

/**
 * User Login Validation
 */
export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

/**
 * Event Creation Validation
 */
export const validateEvent = [
  body('name').trim().notEmpty().withMessage('Event name is required'),
  body('type')
    .isIn(['conference', 'wedding', 'corporate', 'exhibition', 'other'])
    .withMessage('Invalid event type'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('expectedGuests')
    .isInt({ min: 1 })
    .withMessage('Expected guests must be at least 1'),
  body('bookingDeadline').isISO8601().withMessage('Valid booking deadline is required'),
  validate,
];

/**
 * Inventory Creation Validation
 */
export const validateInventory = [
  body('event').isMongoId().withMessage('Valid event ID is required'),
  body('hotelName').trim().notEmpty().withMessage('Hotel name is required'),
  body('roomType').trim().notEmpty().withMessage('Room type is required'),
  body('totalRooms').isInt({ min: 1 }).withMessage('Total rooms must be at least 1'),
  body('pricePerNight').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('checkInDate').isISO8601().withMessage('Valid check-in date is required'),
  body('checkOutDate').isISO8601().withMessage('Valid check-out date is required'),
  validate,
];

/**
 * Booking Creation Validation
 */
export const validateBooking = [
  body('event').isMongoId().withMessage('Valid event ID is required'),
  body('inventory').isMongoId().withMessage('Valid inventory ID is required'),
  body('roomDetails.numberOfRooms')
    .isInt({ min: 1 })
    .withMessage('Number of rooms must be at least 1'),
  validate,
];

/**
 * MongoDB ID Validation
 */
export const validateMongoId = [param('id').isMongoId().withMessage('Invalid ID'), validate];
