/**
 * TBO Search Service
 * Parses and transforms TBO Search API responses into pricing data
 */
class TBOSearchService {
  /**
   * Parse TBO Search API response
   * @param {Object} searchResponse - Response from TBO Search API
   * @returns {Array} Parsed hotel results with room pricing
   */
  parseSearchResponse(searchResponse) {
    if (!searchResponse || !searchResponse.HotelResult) {
      console.warn('⚠️ No hotel results in search response');
      return [];
    }

    const hotels = searchResponse.HotelResult;
    return hotels.map(hotel => this.parseHotelResult(hotel));
  }

  /**
   * Parse individual hotel result
   * @param {Object} hotel - Hotel result from TBO Search
   * @returns {Object} Parsed hotel with categorized rooms
   */
  parseHotelResult(hotel) {
    const hotelCode = hotel.HotelCode;
    const currency = hotel.Currency || 'USD';
    const rooms = hotel.Rooms || [];

    // Categorize rooms
    const categorizedRooms = this.categorizeRooms(rooms, currency);

    return {
      hotelCode,
      currency,
      rooms: categorizedRooms,
      rawRooms: rooms, // Keep raw data for booking
    };
  }

  /**
   * Categorize rooms into single, double, and suite
   * @param {Array} rooms - Rooms from TBO response
   * @param {string} currency - Currency code
   * @returns {Object} Categorized rooms with pricing
   */
  categorizeRooms(rooms, currency) {
    const categorized = {
      singleRoom: [],
      doubleRoom: [],
      suite: [],
      other: [],
    };

    for (const room of rooms) {
      const roomName = (room.Name || ['Unknown'])[0].toLowerCase();
      const category = this.determineRoomCategory(roomName);
      
      const roomData = {
        name: room.Name ? room.Name[0] : 'Unknown',
        bookingCode: room.BookingCode,
        pricePerNight: this.convertToINR(room.TotalFare, currency),
        totalFare: this.convertToINR(room.TotalFare, currency),
        dayRates: this.parseDayRates(room.DayRates, currency),
        mealType: room.MealType || 'Room_Only',
        isRefundable: room.IsRefundable || false,
        cancellationDeadline: this.parseCancellationDeadline(room.CancelPolicies),
        rawCurrency: currency,
        rawPrice: room.TotalFare,
      };

      categorized[category].push(roomData);
    }

    return categorized;
  }

  /**
   * Determine room category from room name
   * @param {string} roomName - Room name from TBO
   * @returns {string} Category: singleRoom, doubleRoom, suite, or other
   */
  determineRoomCategory(roomName) {
    // Single room keywords
    if (
      roomName.includes('single') ||
      roomName.includes('twin bed') ||
      roomName.includes('1 twin')
    ) {
      return 'singleRoom';
    }

    // Suite keywords
    if (
      roomName.includes('suite') ||
      roomName.includes('presidential') ||
      roomName.includes('deluxe suite') ||
      roomName.includes('executive suite')
    ) {
      return 'suite';
    }

    // Double room keywords (default for most cases)
    if (
      roomName.includes('double') ||
      roomName.includes('king') ||
      roomName.includes('queen') ||
      roomName.includes('2 bed') ||
      roomName.includes('deluxe') ||
      roomName.includes('superior') ||
      roomName.includes('standard')
    ) {
      return 'doubleRoom';
    }

    // Default to other if can't determine
    return 'other';
  }

  /**
   * Convert USD to INR
   * @param {number} usdAmount - Amount in USD
   * @param {string} currency - Current currency
   * @returns {number} Amount in INR
   */
  convertToINR(usdAmount, currency) {
    if (currency === 'INR') {
      return Math.round(usdAmount);
    }
    
    // USD to INR conversion rate (approximate)
    const conversionRate = 83;
    return Math.round(usdAmount * conversionRate);
  }

  /**
   * Parse day rates from TBO response
   * @param {Array} dayRates - Day rates array from TBO
   * @param {string} currency - Currency code
   * @returns {Array} Parsed day rates in INR
   */
  parseDayRates(dayRates, currency) {
    if (!dayRates || dayRates.length === 0) {
      return [];
    }

    return dayRates[0].map(day => ({
      basePrice: this.convertToINR(day.BasePrice, currency),
      tax: day.Tax ? this.convertToINR(day.Tax, currency) : 0,
    }));
  }

  /**
   * Parse cancellation deadline from cancellation policies
   * @param {Array} cancelPolicies - Cancellation policies
   * @returns {string|null} Cancellation deadline date
   */
  parseCancellationDeadline(cancelPolicies) {
    if (!cancelPolicies || cancelPolicies.length === 0) {
      return null;
    }

    // Get the earliest cancellation date
    const dates = cancelPolicies
      .map(policy => policy.FromDate)
      .filter(date => date);

    return dates.length > 0 ? dates[0] : null;
  }

  /**
   * Get best price for each room category
   * @param {Object} categorizedRooms - Categorized rooms
   * @returns {Object} Best prices for each category
   */
  getBestPrices(categorizedRooms) {
    const bestPrices = {};

    for (const [category, rooms] of Object.entries(categorizedRooms)) {
      if (rooms.length === 0) {
        bestPrices[category] = null;
        continue;
      }

      // Find room with lowest price
      const cheapest = rooms.reduce((min, room) => 
        room.pricePerNight < min.pricePerNight ? room : min
      );

      bestPrices[category] = cheapest;
    }

    return bestPrices;
  }

  /**
   * Generate available rooms estimate (random for now)
   * @returns {number} Random number between 5 and 20
   */
  generateAvailableRooms() {
    return Math.floor(Math.random() * 16) + 5; // 5 to 20 rooms
  }

  /**
   * Transform search results to HotelProposal pricing format
   * @param {Object} searchResult - Parsed search result for a hotel
   * @returns {Object} Pricing data for HotelProposal
   */
  transformToPricingData(searchResult) {
    const { rooms } = searchResult;
    const bestPrices = this.getBestPrices(rooms);

    const pricing = {
      singleRoom: bestPrices.singleRoom ? {
        pricePerNight: bestPrices.singleRoom.pricePerNight,
        availableRooms: this.generateAvailableRooms(),
        bookingCode: bestPrices.singleRoom.bookingCode,
        mealType: bestPrices.singleRoom.mealType,
      } : null,
      doubleRoom: bestPrices.doubleRoom ? {
        pricePerNight: bestPrices.doubleRoom.pricePerNight,
        availableRooms: this.generateAvailableRooms(),
        bookingCode: bestPrices.doubleRoom.bookingCode,
        mealType: bestPrices.doubleRoom.mealType,
      } : null,
      suite: bestPrices.suite ? {
        pricePerNight: bestPrices.suite.pricePerNight,
        availableRooms: this.generateAvailableRooms(),
        bookingCode: bestPrices.suite.bookingCode,
        mealType: bestPrices.suite.mealType,
      } : null,
    };

    return {
      pricing,
      metadata: {
        currency: 'INR',
        rawCurrency: searchResult.currency,
        searchDate: new Date(),
        rawRooms: searchResult.rawRooms,
      },
    };
  }
}

export default new TBOSearchService();
