import User from '../models/User.js';

/**
 * TBO Transform Service
 * Transforms TBO API data to our User (Hotel) schema
 */
class TBOTransformService {
  /**
   * Transform TBO hotel data to User model format
   * @param {Object} tboHotel - Hotel data from TBO API
   * @param {string} cityName - City name
   * @returns {Object} Transformed hotel data for User model
   */
  transformHotelToUser(tboHotel, cityName = 'Unknown') {
    // Extract basic info
    const hotelCode = tboHotel.HotelCode;
    const hotelName = tboHotel.HotelName || `Hotel ${hotelCode}`;
    const starRating = this.convertHotelRating(tboHotel.HotelRating);
    
    // Parse address
    const address = this.parseAddress(tboHotel);
    const location = {
      city: tboHotel.CityName || cityName,
      state: this.getCityState(tboHotel.CityName || cityName),
      country: tboHotel.CountryName || 'India',
      coordinates: {
        latitude: parseFloat(tboHotel.Latitude) || 0,
        longitude: parseFloat(tboHotel.Longitude) || 0,
      },
    };

    // Estimate total rooms based on star rating
    const totalRooms = this.estimateTotalRooms(starRating);

    // Parse facilities
    const facilities = this.parseFacilities(tboHotel.HotelFacilities || tboHotel.Facilities || '');

    // Infer specialization from hotel name and facilities
    const specialization = this.inferSpecialization(hotelName, facilities);

    // Estimate price range based on star rating
    const priceRange = this.estimatePriceRange(starRating);

    // Generate email and phone
    const email = this.generateEmail(hotelName, hotelCode);
    const phone = this.generatePhone();

    // Create username from hotel name
    const username = this.generateUsername(hotelName, hotelCode);

    return {
      username,
      email,
      phone,
      password: 'TBOHotel@123', // Default password, hotels won't actually log in
      role: 'hotel',
      name: hotelName,
      address,
      location,
      totalRooms,
      availableRooms: totalRooms, // Initially all rooms available
      specialization,
      description: tboHotel.Description || `${starRating}-star hotel in ${cityName}`,
      priceRange,
      facilities,
      images: tboHotel.Images || [],
      averageRating: starRating || 3,
      hasAccessed: false,
      hotelSource: 'tbo',
      tboData: {
        hotelCode: hotelCode,
        cityCode: tboHotel.CityCode || '',
        countryCode: 'IN',
        starRating: starRating,
        latitude: tboHotel.Latitude || 0,
        longitude: tboHotel.Longitude || 0,
        map: tboHotel.Map || '',
      },
    };
  }

  /**
   * Parse address from TBO hotel data
   */
  parseAddress(tboHotel) {
    const addressStr = tboHotel.Address || '';
    return {
      street: addressStr.split(',')[0]?.trim() || 'Unknown Street',
      city: tboHotel.CityName || 'Unknown City',
      state: this.getCityState(tboHotel.CityName),
      country: tboHotel.CountryName || 'India',
      postalCode: '000000',
    };
  }

  /**
   * Convert TBO HotelRating to numeric star rating
   */
  convertHotelRating(hotelRating) {
    const ratingMap = {
      'OneStar': 1,
      'TwoStar': 2,
      'ThreeStar': 3,
      'FourStar': 4,
      'FiveStar': 5,
    };
    return ratingMap[hotelRating] || 3;
  }

  /**
   * Get state for a city
   */
  getCityState(cityName) {
    const cityStateMap = {
      'Kolkata': 'West Bengal',
      'Calcutta': 'West Bengal',
      'Hyderabad': 'Telangana',
      'Bangalore': 'Karnataka',
      'Bengaluru': 'Karnataka',
      'Mumbai': 'Maharashtra',
      'Bombay': 'Maharashtra',
      'Delhi': 'Delhi',
      'New Delhi': 'Delhi',
    };
    return cityStateMap[cityName] || 'Unknown';
  }

  /**
   * Estimate total rooms based on star rating
   */
  estimateTotalRooms(starRating) {
    const baseRooms = 50;
    const ratingMultiplier = starRating * 40;
    const randomVariation = Math.floor(Math.random() * 50); // 0-49
    return baseRooms + ratingMultiplier + randomVariation;
  }

  /**
   * Parse facilities from TBO facility string
   */
  parseFacilities(facilitiesStr) {
    // TBO API doesn't provide facilities in the hotel list response
    // Return default facilities based on star rating
    if (!facilitiesStr || typeof facilitiesStr !== 'string') {
      return ['wifi', 'parking', 'restaurant'];
    }

    const facilityKeywords = {
      wifi: ['wifi', 'wi-fi', 'internet', 'wireless'],
      parking: ['parking', 'valet', 'garage'],
      pool: ['pool', 'swimming'],
      gym: ['gym', 'fitness', 'exercise'],
      spa: ['spa', 'massage', 'wellness'],
      restaurant: ['restaurant', 'dining', 'cafe', 'coffee'],
      bar: ['bar', 'lounge', 'pub'],
      roomService: ['room service', 'in-room dining'],
      ac: ['air conditioning', 'a/c', 'ac', 'climate'],
      tv: ['television', 'tv', 'cable'],
      breakfast: ['breakfast', 'morning meal'],
      conferenceRoom: ['conference', 'meeting', 'business center'],
      airportShuttle: ['airport', 'shuttle', 'transfer'],
      laundry: ['laundry', 'dry cleaning'],
    };

    const facilities = [];
    const lowerFacilities = facilitiesStr.toLowerCase();

    for (const [facility, keywords] of Object.entries(facilityKeywords)) {
      if (keywords.some(keyword => lowerFacilities.includes(keyword))) {
        facilities.push(facility);
      }
    }

    return facilities.length > 0 ? facilities : ['wifi', 'parking', 'restaurant'];
  }

  /**
   * Infer specialization from hotel name and facilities
   */
  inferSpecialization(hotelName, facilities) {
    const specializations = [];
    const lowerName = hotelName.toLowerCase();

    if (lowerName.includes('resort') || facilities.includes('pool')) {
      specializations.push('resort');
    }
    if (lowerName.includes('business') || facilities.includes('conferenceRoom')) {
      specializations.push('business');
    }
    if (lowerName.includes('spa') || facilities.includes('spa')) {
      specializations.push('wellness');
    }
    if (lowerName.includes('boutique')) {
      specializations.push('boutique');
    }
    if (lowerName.includes('luxury') || lowerName.includes('grand')) {
      specializations.push('luxury');
    }
    if (lowerName.includes('budget') || lowerName.includes('inn')) {
      specializations.push('budget');
    }

    // Default specialization if none found
    if (specializations.length === 0) {
      specializations.push('general');
    }

    return specializations;
  }

  /**
   * Estimate price range based on star rating
   * Prices in INR
   */
  estimatePriceRange(starRating) {
    const priceMap = {
      1: { min: 800, max: 1500 },
      2: { min: 1500, max: 3000 },
      3: { min: 3000, max: 6000 },
      4: { min: 6000, max: 12000 },
      5: { min: 12000, max: 30000 },
    };

    const rating = Math.min(Math.max(starRating, 1), 5);
    return priceMap[rating];
  }

  /**
   * Generate email from hotel name
   */
  generateEmail(hotelName, hotelCode) {
    const cleanName = hotelName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    return `${cleanName}.${hotelCode}@tbohotels.com`;
  }

  /**
   * Generate random Indian phone number
   */
  generatePhone() {
    const prefixes = ['98', '99', '97', '96', '95'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(10000000 + Math.random() * 90000000);
    return `+91${prefix}${suffix}`;
  }

  /**
   * Generate username from hotel name
   */
  generateUsername(hotelName, hotelCode) {
    const cleanName = hotelName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    return `tbo_${cleanName}_${hotelCode}`;
  }

  /**
   * Batch transform multiple hotels
   * @param {Array} tboHotels - Array of TBO hotel data
   * @param {string} cityName - City name
   * @returns {Array} Array of transformed hotel data
   */
  async transformBatch(tboHotels, cityName) {
    return tboHotels.map(hotel => this.transformHotelToUser(hotel, cityName));
  }

  /**
   * Save transformed hotels to database
   * @param {Array} transformedHotels - Array of transformed hotel data
   * @returns {Array} Array of saved hotel documents
   */
  async saveHotelsToDatabase(transformedHotels) {
    const savedHotels = [];
    
    for (const hotelData of transformedHotels) {
      try {
        // Check if hotel already exists
        const existingHotel = await User.findOne({
          'tboData.hotelCode': hotelData.tboData.hotelCode,
        });

        if (existingHotel) {
          console.log(`⚠️ Hotel already exists: ${hotelData.name} (${hotelData.tboData.hotelCode})`);
          savedHotels.push(existingHotel);
          continue;
        }

        // Create new hotel
        const hotel = new User(hotelData);
        await hotel.save();
        
        console.log(`✅ Saved hotel: ${hotelData.name} (${hotelData.tboData.hotelCode})`);
        savedHotels.push(hotel);
      } catch (error) {
        console.error(`❌ Error saving hotel ${hotelData.name}:`, error.message);
      }
    }

    return savedHotels;
  }
}

export default new TBOTransformService();
