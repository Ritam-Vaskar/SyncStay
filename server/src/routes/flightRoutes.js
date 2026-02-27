import express from 'express';
import {
  // Planner Operations
  initializeFlightConfiguration,
  updateFlightConfiguration,
  searchFlightsForGroup,
  selectFlightsForGroup,
  publishFlightConfiguration,
  getFlightConfiguration,
  // Guest Operations
  getAssignedFlights,
  getFareQuote,
  bookFlight,
  ticketFlight,
  getGuestFlightBookings,
  getBookingDetails,
  cancelBooking,
} from '../controllers/flightController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * PLANNER ROUTES - Protected, Planner Role Only
 */

// Initialize/Get flight configuration for event
router.get(
  '/events/:eventId/configuration',
  protect,
  authorize('planner', 'admin'),
  getFlightConfiguration
);

router.post(
  '/events/:eventId/configuration/initialize',
  protect,
  authorize('planner'),
  initializeFlightConfiguration
);

// Update flight configuration
router.put(
  '/events/:eventId/configuration',
  protect,
  authorize('planner'),
  updateFlightConfiguration
);

// Search flights for a specific location group
router.post(
  '/events/:eventId/groups/:groupName/search',
  protect,
  authorize('planner'),
  searchFlightsForGroup
);

// Select and save flights for a location group
router.post(
  '/events/:eventId/groups/:groupName/select',
  protect,
  authorize('planner'),
  selectFlightsForGroup
);

// Publish flight configuration (make available to guests)
router.post(
  '/events/:eventId/configuration/publish',
  protect,
  authorize('planner'),
  publishFlightConfiguration
);

/**
 * GUEST ROUTES - Public or Token Protected
 */

// Get assigned flights for guest (based on email)
router.get('/events/:eventId/assigned', getAssignedFlights);

// Get fare quote for a specific flight
router.post('/fare-quote', getFareQuote);

// Book flight
router.post('/book', bookFlight);

// Ticket flight (after payment)
router.post('/bookings/:bookingId/ticket', ticketFlight);

// Get guest flight bookings
router.get('/events/:eventId/bookings', getGuestFlightBookings);

// Get booking details by booking ID
router.get('/bookings/:bookingId', getBookingDetails);

// Cancel booking
router.post('/bookings/:bookingId/cancel', cancelBooking);

/**
 * ADMIN/PLANNER - View All Bookings for Event
 */
router.get(
  '/events/:eventId/all-bookings',
  protect,
  authorize('planner', 'admin'),
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const FlightBooking = (await import('../models/FlightBooking.js')).default;

      const bookings = await FlightBooking.find({ event: eventId })
        .populate('event', 'name startDate endDate')
        .sort({ createdAt: -1 });

      res.json({
        message: 'All bookings retrieved',
        bookings,
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0),
      });
    } catch (error) {
      console.error('Get All Bookings Error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

export default router;
