import axios from 'axios';

/**
 * TBO Flight API Service
 * Handles all interactions with TBO Flight Booking API
 */
class TBOFlightService {
  constructor() {
    this.baseUrl = process.env.TBO_FLIGHT_API_URL || 'http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest';
    this.authUrl = 'http://Sharedapi.tektravels.com/SharedData.svc/rest';
    this.clientId = process.env.TBO_FLIGHT_CLIENT_ID || 'ApiIntegrationNew';
    this.username = process.env.TBO_FLIGHT_USERNAME;
    this.password = process.env.TBO_FLIGHT_PASSWORD;
    this.endUserIp = process.env.TBO_END_USER_IP || '103.161.223.14';
    this.tokenId = null;
    this.tokenExpiry = null;
  }

  /**
   * 1. Authenticate - Get TokenId for subsequent calls
   */
  async authenticate() {
    try {
      // Check if token is still valid (cache for 1 hour)
      if (this.tokenId && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return {
          TokenId: this.tokenId,
          ClientId: this.clientId,
        };
      }

      console.log('🔐 Authenticating with TBO Flight API...');
      console.log('Auth URL:', `${this.authUrl}/Authenticate`);
      console.log('ClientId:', this.clientId);
      console.log('Username:', this.username);

      const response = await axios.post(`${this.authUrl}/Authenticate`, {
        ClientId: this.clientId,
        UserName: this.username,
        Password: this.password,
        EndUserIp: this.endUserIp,
      });

      console.log('Auth Response Status:', response.status);
      console.log('Auth Response Data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.TokenId) {
        this.tokenId = response.data.TokenId;
        // Set token expiry to 1 hour from now
        this.tokenExpiry = Date.now() + 3600000;

        console.log('✅ TBO Flight API authenticated successfully');
        console.log('TokenId:', this.tokenId);
        return response.data;
      }

      throw new Error('Authentication failed: No TokenId received');
    } catch (error) {
      console.error('❌ TBO Flight Authentication Error:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      }
      throw new Error(`Flight API authentication failed: ${error.response?.data?.Message || error.message}`);
    }
  }

  /**
   * 2. Search Flights
   * @param {Object} searchParams - Flight search parameters
   */
  async searchFlights(searchParams) {
    try {
      await this.authenticate();

      const {
        origin,
        destination,
        departureDate,
        returnDate = null,
        adultCount = 1,
        childCount = 0,
        infantCount = 0,
        cabinClass = 'Economy', // Economy, Premium Economy, Business, First
        preferredAirlines = '',
      } = searchParams;

      // Determine journey type (1 = OneWay, 2 = Return)
      const journeyType = returnDate ? 2 : 1;

      // Format dates to YYYY-MM-DDTHH:mm:ss format (TBO API requirement)
      const formattedDepartureDate = this.formatDate(departureDate);
      const formattedReturnDate = returnDate ? this.formatDate(returnDate) : null;

      // Build segments
      const segments = [
        {
          Origin: origin.toUpperCase(),
          Destination: destination.toUpperCase(),
          FlightCabinClass: this.getCabinClassCode(cabinClass).toString(),
          PreferredDepartureTime: formattedDepartureDate,
          PreferredArrivalTime: formattedDepartureDate,
        },
      ];

      // Add return segment if return date provided
      if (returnDate) {
        segments.push({
          Origin: destination.toUpperCase(),
          Destination: origin.toUpperCase(),
          FlightCabinClass: this.getCabinClassCode(cabinClass).toString(),
          PreferredDepartureTime: formattedReturnDate,
          PreferredArrivalTime: formattedReturnDate,
        });
      }

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        AdultCount: adultCount.toString(),
        ChildCount: childCount.toString(),
        InfantCount: infantCount.toString(),
        DirectFlight: "false",
        OneStopFlight: "false",
        JourneyType: journeyType,
        PreferredAirlines: preferredAirlines || null,
        Segments: segments,
        Sources: null,
      };

      console.log('🔍 Searching flights:', { origin, destination, departureDate });
      console.log('📤 Search Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(`${this.baseUrl}/Search`, requestBody);

      console.log('📥 Search Response Status:', response.status);
      console.log('📥 Search Response Data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.Response) {
        const searchResponse = response.data.Response;
        console.log(`✅ Found ${searchResponse.Results?.[0]?.length || 0} flight options`);
        
        return {
          success: true,
          traceId: searchResponse.TraceId,
          results: searchResponse.Results || [],
          origin: searchResponse.Origin,
          destination: searchResponse.Destination,
        };
      }

      throw new Error('No flight results found');
    } catch (error) {
      console.error('❌ Flight Search Error:', error.message);
      if (error.response) {
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        error: error.response?.data?.Message || error.response?.data || error.message,
      };
    }
  }

  /**
   * 3. Get Fare Quote - Confirm pricing and get fare rules
   * @param {String} traceId - TraceId from search response
   * @param {String} resultIndex - ResultIndex of selected flight
   */
  async getFareQuote(traceId, resultIndex) {
    try {
      await this.authenticate();

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
      };

      console.log('💰 Getting fare quote:', { traceId, resultIndex });

      const response = await axios.post(`${this.baseUrl}/FareQuote`, requestBody);

      if (response.data && response.data.Response) {
        console.log('✅ Fare quote retrieved successfully');
        return {
          success: true,
          data: response.data.Response,
        };
      }

      throw new Error('Failed to get fare quote');
    } catch (error) {
      console.error('❌ Fare Quote Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 4. Get Fare Rule - Get cancellation and fare rules
   * @param {String} traceId
   * @param {String} resultIndex
   */
  async getFareRule(traceId, resultIndex) {
    try {
      await this.authenticate();

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
      };

      console.log('📋 Getting fare rules:', { traceId, resultIndex });

      const response = await axios.post(`${this.baseUrl}/FareRule`, requestBody);

      if (response.data && response.data.Response) {
        console.log('✅ Fare rules retrieved successfully');
        return {
          success: true,
          data: response.data.Response,
        };
      }

      throw new Error('Failed to get fare rules');
    } catch (error) {
      console.error('❌ Fare Rule Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 5. SSR (Optional Services) - Get seat, meal, baggage options
   * @param {String} traceId
   * @param {String} resultIndex
   */
  async getSSR(traceId, resultIndex) {
    try {
      await this.authenticate();

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
      };

      console.log('🍱 Getting SSR details:', { traceId, resultIndex });

      const response = await axios.post(`${this.baseUrl}/SSR`, requestBody);

      if (response.data && response.data.Response) {
        console.log('✅ SSR details retrieved successfully');
        return {
          success: true,
          data: response.data.Response,
        };
      }

      throw new Error('Failed to get SSR details');
    } catch (error) {
      console.error('❌ SSR Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 6. Book Flight (Non-LCC and LCC)
   * @param {Object} bookingData - Booking details
   */
  async bookFlight(bookingData) {
    try {
      await this.authenticate();

      const {
        traceId,
        resultIndex,
        passengers,
        guestDetails, // { name, email, phone }
      } = bookingData;

      // Format passengers for TBO API
      const formattedPassengers = passengers.map((pax, index) => ({
        Title: pax.title,
        FirstName: pax.firstName,
        LastName: pax.lastName,
        PaxType: parseInt(pax.paxType) || 1, // 1=Adult, 2=Child, 3=Infant
        DateOfBirth: this.formatDate(pax.dateOfBirth),
        Gender: pax.gender === 'M' ? 1 : 2, // 1=Male, 2=Female
        PassportNo: pax.passportNo || '',
        PassportExpiry: pax.passportExpiry ? this.formatDate(pax.passportExpiry) : '',
        AddressLine1: 'India',
        City: 'Delhi',
        CountryCode: 'IN',
        CountryName: 'India',
        Nationality: pax.nationality || 'IN',
        ContactNo: guestDetails.phone || '',
        Email: guestDetails.email,
        IsLeadPax: index === 0,
        FFAirlineCode: null,
        FFNumber: '',
        // SSR (Optional)
        ...(pax.mealCode && { Meal: [{ Code: pax.mealCode }] }),
        ...(pax.seatNumber && { Seat: [{ Code: pax.seatNumber }] }),
        ...(pax.baggageCode && { Baggage: [{ Code: pax.baggageCode }] }),
      }));

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        TraceId: traceId,
        ResultIndex: resultIndex,
        Passengers: formattedPassengers,
      };

      console.log('✈️ Booking flight with', passengers.length, 'passenger(s)');

      const response = await axios.post(`${this.baseUrl}/Book`, requestBody);

      if (response.data && response.data.Response) {
        const bookingResponse = response.data.Response;
        console.log('✅ Flight booked successfully - PNR:', bookingResponse.PNR);
        
        return {
          success: true,
          data: {
            bookingId: bookingResponse.BookingId,
            pnr: bookingResponse.PNR,
            status: bookingResponse.Status,
            isPriceChanged: bookingResponse.IsPriceChanged,
            priceChangeAmount: bookingResponse.PriceChangeAmount,
            invoiceAmount: bookingResponse.InvoiceAmount,
            response: bookingResponse,
          },
        };
      }

      throw new Error('Booking failed');
    } catch (error) {
      console.error('❌ Flight Booking Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 7. Ticket Flight - Issue ticket for booking
   * @param {Object} ticketData
   */
  async ticketFlight(ticketData) {
    try {
      await this.authenticate();

      const { bookingId, pnr } = ticketData;

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        BookingId: bookingId,
        PNR: pnr,
      };

      console.log('🎫 Issuing ticket for PNR:', pnr);

      const response = await axios.post(`${this.baseUrl}/Ticket`, requestBody);

      if (response.data && response.data.Response) {
        const ticketResponse = response.data.Response;
        console.log('✅ Ticket issued successfully');
        
        return {
          success: true,
          data: {
            bookingId: ticketResponse.BookingId,
            pnr: ticketResponse.PNR,
            ticketStatus: ticketResponse.Status,
            ticketNumber: ticketResponse.TicketNumber || ticketResponse.Ticket?.TicketId,
            response: ticketResponse,
          },
        };
      }

      throw new Error('Ticketing failed');
    } catch (error) {
      console.error('❌ Flight Ticketing Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 8. Get Booking Details
   * @param {Number} bookingId
   */
  async getBookingDetails(bookingId) {
    try {
      await this.authenticate();

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        BookingId: bookingId,
      };

      console.log('📄 Getting booking details for:', bookingId);

      const response = await axios.post(`${this.baseUrl}/GetBookingDetails`, requestBody);

      if (response.data && response.data.Response) {
        console.log('✅ Booking details retrieved');
        return {
          success: true,
          data: response.data.Response,
        };
      }

      throw new Error('Failed to get booking details');
    } catch (error) {
      console.error('❌ Get Booking Details Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 9. Send Change Request (For changes/cancellations)
   * @param {Object} changeData
   */
  async sendChangeRequest(changeData) {
    try {
      await this.authenticate();

      const { bookingId, requestType, remarks } = changeData;

      const requestBody = {
        EndUserIp: this.endUserIp,
        TokenId: this.tokenId,
        BookingId: bookingId,
        RequestType: requestType, // 1=Cancellation, 2=DateChange, 3=Reissue
        Remarks: remarks,
      };

      console.log('📝 Sending change request:', requestType);

      const response = await axios.post(`${this.baseUrl}/SendChangeRequest`, requestBody);

      if (response.data && response.data.Response) {
        console.log('✅ Change request sent');
        return {
          success: true,
          data: response.data.Response,
        };
      }

      throw new Error('Failed to send change request');
    } catch (error) {
      console.error('❌ Change Request Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * Helper: Get cabin class code
   */
  getCabinClassCode(cabinClass) {
    const classMap = {
      'All': 1,
      'Economy': 2,
      'Premium Economy': 3,
      'Business': 4,
      'PremiumBusiness': 5,
      'First': 6,
    };
    return classMap[cabinClass] || 2; // Default to Economy
  }

  /**
   * Helper: Format date for TBO API (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('.')[0]; // Returns YYYY-MM-DDTHH:mm:ss
  }

  /**
   * Helper: Parse flight details from search result
   */
  parseFlightDetails(flight) {
    try {
      const segment = flight.Segments?.[0]?.[0]; // First segment of first leg
      
      if (!segment) return null;

      return {
        airline: segment.Airline?.AirlineName || '',
        airlineCode: segment.Airline?.AirlineCode || '',
        flightNumber: segment.Airline?.FlightNumber || '',
        origin: segment.Origin?.Airport?.AirportCode || '',
        originCity: segment.Origin?.Airport?.CityName || '',
        destination: segment.Destination?.Airport?.AirportCode || '',
        destinationCity: segment.Destination?.Airport?.CityName || '',
        departureTime: segment.Origin?.DepTime || '',
        arrivalTime: segment.Destination?.ArrTime || '',
        duration: segment.Duration || 0,
        cabinClass: segment.CabinClass || '',
        stops: flight.Segments?.[0]?.length - 1 || 0,
        baggage: segment.Baggage || '',
        cabinBaggage: segment.CabinBaggage || '',
        refundable: flight.IsRefundable || false,
        // Fare details
        baseFare: flight.Fare?.BaseFare || 0,
        tax: flight.Fare?.Tax || 0,
        totalFare: flight.Fare?.PublishedFare || 0,
        currency: flight.Fare?.Currency || 'INR',
        // Additional info
        resultIndex: flight.ResultIndex,
        source: flight.Source, // 5=LCC, 6=GDS
        isLCC: flight.IsLCC || false,
      };
    } catch (error) {
      console.error('Error parsing flight details:', error);
      return null;
    }
  }
}

// Export singleton instance
const tboFlightService = new TBOFlightService();
export default tboFlightService;
