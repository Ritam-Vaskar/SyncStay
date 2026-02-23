import axios from 'axios';

/**
 * TBO Hotel API Service
 * Handles communication with TBO (Travel Boutique Online) API
 */
class TBOService {
  constructor() {
    this.baseURL = 'http://api.tbotechnology.in/TBOHolidays_HotelAPI';
    this.username = process.env.TBO_USERNAME || 'hakathontest';
    this.password = process.env.TBO_PASSWORD || 'Hac@98147521';

    // In-memory TTL cache for hotel details: hotelCode -> { data, expiry }
    this._detailsCache = new Map();
    this._CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: this.username,
        password: this.password,
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Get list of countries
   */
  async getCountryList() {
    try {
      const response = await this.client.post('/CountryList', {});
      return response.data;
    } catch (error) {
      console.error('❌ TBO CountryList Error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch country list: ${error.message}`);
    }
  }

  /**
   * Get list of cities for a country
   * @param {string} countryCode - Country code (e.g., 'IN' for India)
   */
  async getCityList(countryCode) {
    try {
      const response = await this.client.post('/CityList', {
        CountryCode: countryCode,
      });
      return response.data;
    } catch (error) {
      console.error('❌ TBO CityList Error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch city list: ${error.message}`);
    }
  }

  /**
   * Get list of hotel codes for a city
   * @param {string} cityCode - City code from TBO
   * @param {boolean} isDetailedResponse - Get detailed hotel info
   */
  async getHotelCodeList(cityCode, isDetailedResponse = true) {
    try {
      console.log(`🔍 Calling TBO API for city code: ${cityCode}`);
      const response = await this.client.post('/TBOHotelCodeList', {
        CityCode: cityCode,
        IsDetailedResponse: isDetailedResponse,
      });
      console.log(`✅ TBO API response received for city ${cityCode}`);
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error(`❌ TBO API timeout for city ${cityCode}`);
      } else {
        console.error('❌ TBO HotelCodeList Error:', error.response?.data || error.message);
      }
      throw new Error(`Failed to fetch hotel code list: ${error.message}`);
    }
  }

  /**
   * Get detailed information for specific hotels.
   * Uses correct endpoint casing: /HotelDetails (capital D)
   * @param {Array<string>} hotelCodes
   * @param {string} language
   */
  async getHotelDetails(hotelCodes, language = 'EN') {
    try {
      const response = await this.client.post('/HotelDetails', {
        Hotelcodes: hotelCodes.join(','),
        Language: language,
        IsRoomDetailRequired: false,
      });
      return response.data;
    } catch (error) {
      console.error('❌ TBO HotelDetails Error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch hotel details: ${error.message}`);
    }
  }

  /**
   * Cached getHotelDetails — only fetches codes missing from 24-hour cache.
   * Individual hotel detail objects cached per code.
   * @param {Array<string>} hotelCodes
   * @returns {Promise<Array<Object>>} TBO hotel detail objects (nulls stripped)
   */
  async getHotelDetailsCached(hotelCodes) {
    const now = Date.now();
    const results = [];
    const missing = [];

    for (const code of hotelCodes) {
      const entry = this._detailsCache.get(String(code));
      if (entry && entry.expiry > now) {
        if (entry.data) results.push(entry.data);
      } else {
        missing.push(String(code));
      }
    }

    if (missing.length > 0) {
      try {
        console.log(`📡 TBO HotelDetails fetch for ${missing.length} code(s):`, missing);
        const response = await this.getHotelDetails(missing);
        const fetched = response?.Hotels || [];
        for (const hotel of fetched) {
          const code = String(hotel.HotelCode);
          this._detailsCache.set(code, { data: hotel, expiry: now + this._CACHE_TTL_MS });
          results.push(hotel);
        }
        // Cache null sentinel for any codes TBO returned nothing for (avoids repeated retries)
        for (const code of missing) {
          if (!this._detailsCache.has(code)) {
            this._detailsCache.set(code, { data: null, expiry: now + this._CACHE_TTL_MS });
          }
        }
      } catch (err) {
        console.warn('⚠️  TBO HotelDetails fetch failed, skipping enrichment:', err.message);
      }
    }

    return results; // nulls already excluded above
  }

  /**
   * Search for hotel availability and pricing
   * @param {Object} searchParams - Search parameters
   * @param {Array<string>} searchParams.hotelCodes - Hotel codes to search
   * @param {string} searchParams.checkInDate - Check-in date (YYYY-MM-DD)
   * @param {string} searchParams.checkOutDate - Check-out date (YYYY-MM-DD)
   * @param {Array<Object>} searchParams.rooms - Room configurations [{adults: 2, children: 0}]
   */
  async searchHotels(searchParams) {
    try {
      const { hotelCodes, checkInDate, checkOutDate, rooms } = searchParams;

      // Format rooms for TBO API
      const guestNationality = 'IN';
      const noOfRooms = rooms.length;
      
      // Build room guests array
      const roomGuests = rooms.map((room, index) => ({
        NoOfAdults: room.adults || 2,
        NoOfChild: room.children || 0,
        ChildAge: room.childAges || null,
      }));

      const requestBody = {
        CheckIn: checkInDate,
        CheckOut: checkOutDate,
        HotelCodes: hotelCodes.join('|'),
        GuestNationality: guestNationality,
        PaxRooms: roomGuests,
        ResponseTime: 23,
        IsDetailedResponse: true,
        Filters: {
          Refundable: false,
          NoOfRooms: noOfRooms,
        },
      };

      console.log('🔍 TBO Search Request:', JSON.stringify(requestBody, null, 2));

      const response = await this.client.post('/Search', requestBody);
      
      console.log('✅ TBO Search Response received:', response.data?.HotelResult?.length || 0, 'hotels');
      
      return response.data;
    } catch (error) {
      console.error('❌ TBO Search Error:', error.response?.data || error.message);
      throw new Error(`Failed to search hotels: ${error.message}`);
    }
  }

  /**
   * Get hotels for a specific city with pagination
   * @param {string} cityCode - City code
   * @param {number} limit - Number of hotels to fetch
   */
  async getHotelsForCity(cityCode, limit = 12) {
    try {
      console.log(`🏙️ Fetching hotels for city code: ${cityCode}, limit: ${limit}`);
      
      // Get hotel code list for the city
      const hotelCodeData = await this.getHotelCodeList(cityCode, true);
      
      if (!hotelCodeData || !hotelCodeData.Hotels) {
        console.warn(`⚠️ No hotels found for city code: ${cityCode}`);
        return [];
      }

      // Take only the required number of hotels
      const hotelsList = hotelCodeData.Hotels.slice(0, limit);
      
      console.log(`✅ Found ${hotelsList.length} hotels for city ${cityCode}`);
      
      return hotelsList;
    } catch (error) {
      console.error(`❌ Error fetching hotels for city ${cityCode}:`, error.message);
      return [];
    }
  }
}

export default new TBOService();
