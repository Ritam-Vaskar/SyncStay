import FlightBooking from '../models/FlightBooking.js';
import EventFlightConfiguration from '../models/EventFlightConfiguration.js';
import Event from '../models/Event.js';
import tboFlightService from '../services/tboFlightService.js';

/**
 * PLANNER OPERATIONS
 */

/**
 * Initialize or get flight configuration for an event
 */
export const initializeFlightConfiguration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event exists and belongs to planner
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.planner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to manage this event' });
    }

    // Check if configuration already exists
    let configuration = await EventFlightConfiguration.findOne({ event: eventId });

    if (configuration) {
      // Re-sync location groups from current guest data
      const locationGroups = generateLocationGroups(event.invitedGuests);
      configuration.locationGroups = locationGroups;
      configuration.stats = {
        ...configuration.stats,
        totalGroups: locationGroups.length,
        totalGuests: event.invitedGuests?.filter(g => g.location).length || 0,
      };
      await configuration.updateStats();

      return res.json({
        message: 'Flight configuration synced with latest guest data',
        configuration,
      });
    }

    // Create new configuration
    // Auto-generate location groups from invited guests
    const locationGroups = generateLocationGroups(event.invitedGuests);

    // Calculate search window based on event dates
    const searchWindow = calculateSearchWindow(event.startDate, event.endDate);

    configuration = new EventFlightConfiguration({
      event: eventId,
      planner: userId,
      eventLocation: {
        city: event.location?.city,
        airportCode: event.location?.airportCode,
        country: event.location?.country,
      },
      locationGroups,
      searchWindow,
      stats: {
        totalGroups: locationGroups.length,
        totalGuests: event.invitedGuests?.filter(g => g.location).length || 0,
      },
    });

    await configuration.save();

    res.status(201).json({
      message: 'Flight configuration initialized',
      configuration,
    });
  } catch (error) {
    console.error('Initialize Flight Configuration Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update flight configuration (location groups, search window)
 */
export const updateFlightConfiguration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { locationGroups, searchWindow, eventLocation } = req.body;
    const userId = req.user.id;

    const configuration = await EventFlightConfiguration.findOne({ event: eventId });
    if (!configuration) {
      return res.status(404).json({ message: 'Flight configuration not found' });
    }

    if (configuration.planner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update fields
    if (locationGroups) configuration.locationGroups = locationGroups;
    if (searchWindow) configuration.searchWindow = searchWindow;
    if (eventLocation) configuration.eventLocation = eventLocation;

    await configuration.updateStats();

    res.json({
      message: 'Flight configuration updated',
      configuration,
    });
  } catch (error) {
    console.error('Update Flight Configuration Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Search flights for a specific location group
 */
export const searchFlightsForGroup = async (req, res) => {
  try {
    const { eventId, groupName } = req.params;
    const { journeyType, departureDate } = req.body; // journeyType: 'arrival' or 'departure'

    const configuration = await EventFlightConfiguration.findOne({ event: eventId });
    if (!configuration) {
      return res.status(404).json({ message: 'Flight configuration not found' });
    }

    // Find location group
    const locationGroup = configuration.locationGroups.find((g) => g.groupName === groupName);
    if (!locationGroup) {
      return res.status(404).json({ message: 'Location group not found' });
    }

    // Determine origin and destination based on journey type
    let origin, destination;
    if (journeyType === 'arrival') {
      origin = locationGroup.origin;
      destination = configuration.eventLocation.airportCode;
    } else if (journeyType === 'departure') {
      origin = configuration.eventLocation.airportCode;
      destination = locationGroup.origin;
    } else {
      return res.status(400).json({ message: 'Invalid journey type' });
    }

    // Search flights
    const searchResult = await tboFlightService.searchFlights({
      origin,
      destination,
      departureDate,
      adultCount: 1,
      childCount: 0,
      infantCount: 0,
      cabinClass: 'Economy',
    });

    if (!searchResult.success) {
      return res.status(400).json({
        message: 'Flight search failed',
        error: searchResult.error,
      });
    }

    // Parse and format flight results
    const flights = searchResult.results[0]?.map((flight) => {
      const parsed = tboFlightService.parseFlightDetails(flight);
      return {
        ...parsed,
        traceId: searchResult.traceId,
      };
    }) || [];

    res.json({
      message: 'Flights retrieved successfully',
      traceId: searchResult.traceId,
      flights,
      totalResults: flights.length,
    });
  } catch (error) {
    console.error('Search Flights Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Select and save flights for a location group
 */
export const selectFlightsForGroup = async (req, res) => {
  try {
    const { eventId, groupName } = req.params;
    const { flightSelections } = req.body; // { arrivalFlights: [...], departureFlights: [...] }
    const userId = req.user.id;

    const configuration = await EventFlightConfiguration.findOne({ event: eventId });
    if (!configuration) {
      return res.status(404).json({ message: 'Flight configuration not found' });
    }

    if (configuration.planner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Find or create selected flights for this group
    let groupFlightsIndex = configuration.selectedFlights.findIndex((sf) => sf.groupName === groupName);
    
    if (groupFlightsIndex === -1) {
      configuration.selectedFlights.push({
        groupName,
        origin: configuration.locationGroups.find((g) => g.groupName === groupName)?.origin,
        arrivalFlights: [],
        departureFlights: [],
      });
      groupFlightsIndex = configuration.selectedFlights.length - 1;
    }

    // Update flight selections by directly setting on the array element
    if (flightSelections.arrivalFlights && flightSelections.arrivalFlights.length > 0) {
      configuration.selectedFlights[groupFlightsIndex].arrivalFlights = flightSelections.arrivalFlights.map((flight) => ({
        traceId: flight.traceId,
        resultIndex: flight.resultIndex,
        flightDetails: {
          airline: flight.flightDetails?.airline || '',
          airlineCode: flight.flightDetails?.airlineCode || '',
          flightNumber: flight.flightDetails?.flightNumber || '',
          origin: flight.flightDetails?.origin || '',
          destination: flight.flightDetails?.destination || '',
          departureTime: flight.flightDetails?.departureTime,
          arrivalTime: flight.flightDetails?.arrivalTime,
          duration: flight.flightDetails?.duration || '',
          cabinClass: flight.flightDetails?.cabinClass || '',
          stops: flight.flightDetails?.stops || 0,
          baggage: flight.flightDetails?.baggage || '',
          refundable: flight.flightDetails?.refundable || false,
        },
        fare: {
          baseFare: flight.fare?.baseFare || 0,
          tax: flight.fare?.tax || 0,
          totalFare: flight.fare?.totalFare || 0,
          currency: flight.fare?.currency || 'INR',
        },
        selectedAt: new Date(),
        isAvailable: true,
      }));
    }

    if (flightSelections.departureFlights && flightSelections.departureFlights.length > 0) {
      configuration.selectedFlights[groupFlightsIndex].departureFlights = flightSelections.departureFlights.map((flight) => ({
        traceId: flight.traceId,
        resultIndex: flight.resultIndex,
        flightDetails: {
          airline: flight.flightDetails?.airline || '',
          airlineCode: flight.flightDetails?.airlineCode || '',
          flightNumber: flight.flightDetails?.flightNumber || '',
          origin: flight.flightDetails?.origin || '',
          destination: flight.flightDetails?.destination || '',
          departureTime: flight.flightDetails?.departureTime,
          arrivalTime: flight.flightDetails?.arrivalTime,
          duration: flight.flightDetails?.duration || '',
          cabinClass: flight.flightDetails?.cabinClass || '',
          stops: flight.flightDetails?.stops || 0,
          baggage: flight.flightDetails?.baggage || '',
          refundable: flight.flightDetails?.refundable || false,
        },
        fare: {
          baseFare: flight.fare?.baseFare || 0,
          tax: flight.fare?.tax || 0,
          totalFare: flight.fare?.totalFare || 0,
          currency: flight.fare?.currency || 'INR',
        },
        selectedAt: new Date(),
        isAvailable: true,
      }));
    }

    // Mark the nested array as modified so Mongoose persists changes
    configuration.markModified('selectedFlights');

    // Update configured groups
    if (!configuration.configuredGroups.includes(groupName)) {
      configuration.configuredGroups.push(groupName);
    }

    // Update status
    if (configuration.configuredGroups.length === configuration.locationGroups.length) {
      configuration.status = 'completed';
    } else {
      configuration.status = 'in-progress';
    }

    await configuration.updateStats();

    res.json({
      message: 'Flights selected successfully',
      configuration,
      groupFlights: configuration.selectedFlights[groupFlightsIndex],
    });
  } catch (error) {
    console.error('Select Flights Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Publish flight configuration (make available to guests)
 */
export const publishFlightConfiguration = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const configuration = await EventFlightConfiguration.findOne({ event: eventId });
    if (!configuration) {
      return res.status(404).json({ message: 'Flight configuration not found' });
    }

    if (configuration.planner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Allow publishing even if not all groups have flights configured
    // Some groups may not need flight arrangements

    configuration.isPublished = true;
    configuration.publishedAt = new Date();
    configuration.status = 'published';
    await configuration.save();

    res.json({
      message: 'Flight configuration published successfully',
      configuration,
    });
  } catch (error) {
    console.error('Publish Flight Configuration Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get flight configuration for an event
 */
export const getFlightConfiguration = async (req, res) => {
  try {
    const { eventId } = req.params;

    const configuration = await EventFlightConfiguration.findOne({ event: eventId })
      .populate('event', 'name startDate endDate location')
      .populate('planner', 'name email');

    if (!configuration) {
      return res.status(404).json({ message: 'Flight configuration not found' });
    }

    res.json({
      message: 'Flight configuration retrieved',
      configuration,
    });
  } catch (error) {
    console.error('Get Flight Configuration Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * GUEST OPERATIONS
 */

/**
 * Get assigned flights for a guest
 */
export const getAssignedFlights = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail } = req.query;

    if (!guestEmail) {
      return res.status(400).json({ message: 'Guest email is required' });
    }

    const configuration = await EventFlightConfiguration.findOne({ event: eventId })
      .populate('event', 'name startDate endDate location');

    if (!configuration) {
      return res.status(404).json({ message: 'No flights configured for this event' });
    }

    if (!configuration.isPublished) {
      return res.status(403).json({ message: 'Flight bookings not yet available' });
    }

    // Find which group the guest belongs to
    const guestGroup = configuration.locationGroups.find((group) =>
      group.guests.some((g) => g.email === guestEmail)
    );

    if (!guestGroup) {
      return res.status(404).json({ message: 'No flight options available for your location' });
    }

    // Get selected flights for this group
    const groupFlights = configuration.selectedFlights.find(
      (sf) => sf.groupName === guestGroup.groupName
    );

    if (!groupFlights) {
      return res.status(404).json({ message: 'No flights configured for your group' });
    }

    res.json({
      message: 'Assigned flights retrieved',
      event: configuration.event,
      locationGroup: guestGroup.groupName,
      origin: guestGroup.origin,
      destination: configuration.eventLocation.airportCode,
      arrivalFlights: groupFlights.arrivalFlights.filter((f) => f.isAvailable),
      departureFlights: groupFlights.departureFlights.filter((f) => f.isAvailable),
    });
  } catch (error) {
    console.error('Get Assigned Flights Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get fare quote for selected flights
 */
export const getFareQuote = async (req, res) => {
  try {
    const { traceId, resultIndex } = req.body;

    if (!traceId || !resultIndex) {
      return res.status(400).json({ message: 'TraceId and ResultIndex are required' });
    }

    const fareQuote = await tboFlightService.getFareQuote(traceId, resultIndex);

    if (!fareQuote.success) {
      return res.status(400).json({
        message: 'Failed to get fare quote',
        error: fareQuote.error,
      });
    }

    res.json({
      message: 'Fare quote retrieved',
      fareQuote: fareQuote.data,
    });
  } catch (error) {
    console.error('Get Fare Quote Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Book flight for guest
 */
export const bookFlight = async (req, res) => {
  try {
    const {
      eventId,
      guestEmail,
      locationGroup,
      arrivalFlight,
      departureFlight,
      passengers,
      guestDetails,
    } = req.body;

    // Validate required fields
    if (!eventId || !guestEmail || !passengers || passengers.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify event and configuration exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const configuration = await EventFlightConfiguration.findOne({ event: eventId });
    if (!configuration || !configuration.isPublished) {
      return res.status(403).json({ message: 'Flight bookings not available' });
    }

    // Check if event is private to determine payment responsibility
    const isPaidByPlanner = event.isPrivate;

    // Generate a unique booking ID
    const bookingId = `SYN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create flight booking record
    const flightBooking = new FlightBooking({
      bookingId,
      event: eventId,
      guest: guestDetails,
      locationGroup,
      isPaidByPlanner,
      flightSelection: {
        arrival: arrivalFlight ? {
          traceId: arrivalFlight.traceId,
          resultIndex: arrivalFlight.resultIndex,
          flightDetails: arrivalFlight.flightDetails,
          fare: arrivalFlight.fare,
        } : undefined,
        departure: departureFlight ? {
          traceId: departureFlight.traceId,
          resultIndex: departureFlight.resultIndex,
          flightDetails: departureFlight.flightDetails,
          fare: departureFlight.fare,
        } : undefined,
      },
      passengers: passengers.map((p, idx) => ({
        paxId: idx + 1,
        ...p,
      })),
      status: 'pending',
    });

    // Calculate pricing
    const arrivalFare = arrivalFlight?.fare?.totalFare || 0;
    const departureFare = departureFlight?.fare?.totalFare || 0;
    
    flightBooking.pricing = {
      arrivalFare,
      departureFare,
      totalFare: arrivalFare + departureFare,
      tax: 0,
      discount: 0,
      totalAmount: arrivalFare + departureFare,
      currency: 'INR',
    };

    await flightBooking.save();

    // Book arrival flight with TBO
    let arrivalBookingResult = null;
    if (arrivalFlight) {
      arrivalBookingResult = await tboFlightService.bookFlight({
        traceId: arrivalFlight.traceId,
        resultIndex: arrivalFlight.resultIndex,
        passengers,
        guestDetails,
      });

      if (arrivalBookingResult.success) {
        flightBooking.tboBookingData.arrivalBooking = {
          bookingId: arrivalBookingResult.data.bookingId,
          pnr: arrivalBookingResult.data.pnr,
          ticketStatus: 'booked',
          bookingResponse: arrivalBookingResult.data.response,
          bookedAt: new Date(),
        };
      }
    }

    // Book departure flight with TBO
    let departureBookingResult = null;
    if (departureFlight) {
      departureBookingResult = await tboFlightService.bookFlight({
        traceId: departureFlight.traceId,
        resultIndex: departureFlight.resultIndex,
        passengers,
        guestDetails,
      });

      if (departureBookingResult.success) {
        flightBooking.tboBookingData.departureBooking = {
          bookingId: departureBookingResult.data.bookingId,
          pnr: departureBookingResult.data.pnr,
          ticketStatus: 'booked',
          bookingResponse: departureBookingResult.data.response,
          bookedAt: new Date(),
        };
      }
    }

    // Update status
    if (
      (arrivalFlight && arrivalBookingResult?.success) ||
      (departureFlight && departureBookingResult?.success)
    ) {
      flightBooking.status = 'booked';
      flightBooking.paymentStatus = 'unpaid';
    } else {
      flightBooking.status = 'failed';
    }

    await flightBooking.save();

    // Update configuration stats
    configuration.stats.totalBookings += 1;
    configuration.stats.totalRevenue += flightBooking.pricing.totalAmount;
    await configuration.save();

    res.status(201).json({
      message: 'Flight booking created successfully',
      booking: flightBooking,
      arrivalBooking: arrivalBookingResult?.data,
      departureBooking: departureBookingResult?.data,
    });
  } catch (error) {
    console.error('Book Flight Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Ticket flight after payment
 */
export const ticketFlight = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentDetails } = req.body;

    const flightBooking = await FlightBooking.findOne({ bookingId });
    if (!flightBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (flightBooking.status !== 'booked') {
      return res.status(400).json({ message: 'Booking is not in booked status' });
    }

    // Update payment details
    flightBooking.paymentDetails = paymentDetails;
    flightBooking.paymentStatus = 'paid';

    // Ticket arrival flight
    if (flightBooking.tboBookingData.arrivalBooking?.bookingId) {
      const arrivalTicket = await tboFlightService.ticketFlight({
        bookingId: flightBooking.tboBookingData.arrivalBooking.bookingId,
        pnr: flightBooking.tboBookingData.arrivalBooking.pnr,
      });

      if (arrivalTicket.success) {
        flightBooking.tboBookingData.arrivalBooking.ticketStatus = 'ticketed';
        flightBooking.tboBookingData.arrivalBooking.ticketNumber = arrivalTicket.data.ticketNumber;
        flightBooking.tboBookingData.arrivalBooking.ticketResponse = arrivalTicket.data.response;
        flightBooking.tboBookingData.arrivalBooking.ticketedAt = new Date();
      }
    }

    // Ticket departure flight
    if (flightBooking.tboBookingData.departureBooking?.bookingId) {
      const departureTicket = await tboFlightService.ticketFlight({
        bookingId: flightBooking.tboBookingData.departureBooking.bookingId,
        pnr: flightBooking.tboBookingData.departureBooking.pnr,
      });

      if (departureTicket.success) {
        flightBooking.tboBookingData.departureBooking.ticketStatus = 'ticketed';
        flightBooking.tboBookingData.departureBooking.ticketNumber = departureTicket.data.ticketNumber;
        flightBooking.tboBookingData.departureBooking.ticketResponse = departureTicket.data.response;
        flightBooking.tboBookingData.departureBooking.ticketedAt = new Date();
      }
    }

    flightBooking.status = 'ticketed';
    await flightBooking.save();

    res.json({
      message: 'Flight ticketed successfully',
      booking: flightBooking,
    });
  } catch (error) {
    console.error('Ticket Flight Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get guest flight bookings
 */
export const getGuestFlightBookings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestEmail } = req.query;

    if (!guestEmail) {
      return res.status(400).json({ message: 'Guest email is required' });
    }

    const bookings = await FlightBooking.find({
      event: eventId,
      'guest.email': guestEmail,
    })
      .populate('event', 'name startDate endDate location')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Bookings retrieved',
      bookings,
      totalBookings: bookings.length,
    });
  } catch (error) {
    console.error('Get Guest Flight Bookings Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get booking details by booking ID
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await FlightBooking.findOne({ bookingId })
      .populate('event', 'name startDate endDate location');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      message: 'Booking details retrieved',
      booking,
    });
  } catch (error) {
    console.error('Get Booking Details Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await FlightBooking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    // Update status
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();

    await booking.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * HELPER FUNCTIONS
 */

/**
 * Get all flight bookings for an event (Planner only)
 */
export const getPlannerFlightBookings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event exists and belongs to planner
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.planner.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to view these bookings' });
    }

    const bookings = await FlightBooking.find({ event: eventId })
      .populate('event', 'name startDate endDate location isPrivate')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Flight bookings retrieved',
      data: bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Get Planner Flight Bookings Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * Process planner bulk payment for flight bookings (Private events)
 */
export const processPlannerFlightPayment = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingIds } = req.body;
    const userId = req.user.id;

    // Verify event exists and belongs to planner
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    if (event.planner.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    if (!event.isPrivate) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment not required for public events' 
      });
    }

    // Validate booking IDs
    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No bookings specified in payment',
      });
    }

    console.log(`💳 Processing flight payment for ${bookingIds.length} booking(s)`);

    // Update ONLY the selected flight bookings to paid
    const updateResult = await FlightBooking.updateMany(
      { 
        _id: { $in: bookingIds },
        event: eventId, 
        isPaidByPlanner: true,
        paymentStatus: 'unpaid'
      },
      { 
        paymentStatus: 'paid',
        status: 'ticketed',  // Auto-confirm flight bookings when planner pays
        razorpay_payment_id,
        razorpay_order_id,
        paidAt: new Date(),
        'paymentDetails.razorpayPaymentId': razorpay_payment_id,
        'paymentDetails.razorpayOrderId': razorpay_order_id,
        'paymentDetails.paidAt': new Date()
      }
    );
    
    console.log(`💳 Updated ${updateResult.modifiedCount} of ${bookingIds.length} flight bookings to 'paid' status`);

    res.status(200).json({
      success: true,
      message: `Payment successful! ${updateResult.modifiedCount} flight booking(s) confirmed.`,
      data: {
        updatedCount: updateResult.modifiedCount,
        bookingIds
      }
    });
  } catch (error) {
    console.error('Process Planner Flight Payment Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

/**
 * HELPER FUNCTIONS
 */

/**
 * Generate location groups from invited guests
 * Groups guests by their departure city/location (e.g., "Mumbai (BOM)", "Delhi (DEL)")
 */
function generateLocationGroups(invitedGuests) {
  if (!invitedGuests || invitedGuests.length === 0) return [];

  const groupsMap = {};

  invitedGuests.forEach((guest) => {
    // Group by location (departure city), fall back to 'Unassigned' if no location set
    const locationKey = guest.location || 'Unassigned';
    
    if (locationKey === 'Unassigned') return; // Skip guests without a location

    if (!groupsMap[locationKey]) {
      groupsMap[locationKey] = {
        groupName: locationKey,
        origin: extractAirportCode(locationKey),
        city: locationKey.split('(')[0].trim(),
        guestsCount: 0,
        guests: [],
        isActive: true,
      };
    }

    groupsMap[locationKey].guestsCount += 1;
    groupsMap[locationKey].guests.push({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      group: guest.group || '',
    });
  });

  return Object.values(groupsMap);
}

/**
 * Extract airport code from group name (e.g., "Delhi (DEL)" -> "DEL")
 */
function extractAirportCode(groupName) {
  const match = groupName.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : groupName.substring(0, 3).toUpperCase();
}

/**
 * Calculate flight search window based on event dates
 */
function calculateSearchWindow(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return {
    arrivalSearchStart: new Date(start.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days before
    arrivalSearchEnd: start,
    departureSearchStart: end,
    departureSearchEnd: new Date(end.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days after
  };
}
