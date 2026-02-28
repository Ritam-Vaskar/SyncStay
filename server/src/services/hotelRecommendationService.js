import Event from '../models/Event.js';
import User from '../models/User.js';

/**
 * Generate hotel recommendations based on event criteria
 * @param {String} eventId - The event ID
 * @returns {Array} - Array of recommendations with scores and reasons
 */
export const generateHotelRecommendations = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Get all active hotels
    const hotels = await User.find({ role: 'hotel', isActive: true });
    
    if (hotels.length === 0) {
      return [];
    }

    const recommendations = hotels.map((hotel) => {
      let score = 0;
      const reasons = [];

      // 1. Location matching (40 points max)
      if (hotel.location?.city && event.location?.city) {
        if (hotel.location.city.toLowerCase() === event.location.city.toLowerCase()) {
          score += 40;
          reasons.push('Same city location');
        } else if (hotel.location.country?.toLowerCase() === event.location.country?.toLowerCase()) {
          score += 20;
          reasons.push('Same country');
        }
      }

      // 2. Budget matching (30 points max)
      if (event.budget && event.expectedGuests) {
        const budgetPerGuest = event.budget / event.expectedGuests;
        
        // Estimate hotel average price (if hotel has pricing info)
        let avgHotelPrice = 0;
        if (hotel.priceRange?.min && hotel.priceRange?.max) {
          avgHotelPrice = (hotel.priceRange.min + hotel.priceRange.max) / 2;
        } else if (hotel.priceRange?.min) {
          avgHotelPrice = hotel.priceRange.min;
        }

        if (avgHotelPrice > 0) {
          const priceDiff = Math.abs(avgHotelPrice - budgetPerGuest);
          const priceThreshold = budgetPerGuest * 0.2; // 20% tolerance
          
          if (priceDiff <= priceThreshold) {
            score += 30;
            reasons.push('Budget perfectly aligned');
          } else if (priceDiff <= budgetPerGuest * 0.5) {
            score += 15;
            reasons.push('Budget within range');
          }
        }
      }

      // 3. Event type specialization (15 points max)
      if (hotel.specialization && Array.isArray(hotel.specialization)) {
        if (hotel.specialization.includes(event.type)) {
          score += 15;
          reasons.push(`Specialized in ${event.type} events`);
        }
      }

      // 4. Capacity matching (15 points max)
      if (hotel.totalRooms && event.accommodationNeeds?.totalRooms) {
        if (hotel.totalRooms >= event.accommodationNeeds.totalRooms) {
          score += 15;
          reasons.push('Sufficient room capacity');
        } else if (hotel.totalRooms >= event.accommodationNeeds.totalRooms * 0.7) {
          score += 8;
          reasons.push('Near sufficient capacity');
        }
      }

      // Bonus: Preferred hotel (5 points)
      if (event.accommodationNeeds?.preferredHotels?.length > 0) {
        const hotelName = hotel.name || hotel.organization || '';
        const isPreferred = event.accommodationNeeds.preferredHotels.some(
          (preferred) => hotelName.toLowerCase().includes(preferred.toLowerCase())
        );
        if (isPreferred) {
          score += 5;
          reasons.push('Preferred by planner');
        }
      }

      return {
        hotel: hotel._id,
        score,
        reasons,
        addedAt: new Date(),
        isSelectedByPlanner: false,
      };
    });

    // Filter recommendations with score > 30 (minimum threshold)
    // Sort by score descending and return top 10
    return recommendations
      .filter((rec) => rec.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error generating hotel recommendations:', error);
    throw error;
  }
};

/**
 * Refresh recommendations for an event
 * @param {String} eventId - The event ID
 * @returns {Array} - Updated recommendations
 */
export const refreshRecommendations = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const recommendations = await generateHotelRecommendations(eventId);
  event.recommendedHotels = recommendations;
  await event.save();

  return recommendations;
};
