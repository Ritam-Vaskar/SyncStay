import Event from '../models/Event.js';
import User from '../models/User.js';
import { retrieveVector, searchVectors, COLLECTIONS, uuidToObjectId } from '../config/qdrant.js';
import { combineVectors } from '../services/embeddingService.js';

/**
 * Get personalized event recommendations for a user
 */
export const getUserRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    // Fetch user vector
    const userVectorData = await retrieveVector(COLLECTIONS.USERS, userId.toString());

    let recommendations;

    if (!userVectorData || !userVectorData.vector) {
      // Cold start: return trending/popular events
      recommendations = await getTrendingEvents(parseInt(limit));
      
      return res.status(200).json({
        success: true,
        message: 'Showing trending events (cold start)',
        coldStart: true,
        data: recommendations,
      });
    }

    // Search similar events using user vector (no payload filter - filter in app instead)
    const vectorResults = await searchVectors(
      COLLECTIONS.EVENTS,
      userVectorData.vector,
      50 // Get more for filtering
    );

    // Convert UUIDs back to ObjectIds and fetch full event details
    const eventIds = vectorResults.map((r) => uuidToObjectId(r.id));
    const events = await Event.find({ 
      _id: { $in: eventIds },
      status: 'active' // Filter active events in MongoDB
    }).lean();

    // Create event map for quick lookup (using original UUID for matching)
    const eventMap = {};
    vectorResults.forEach((result) => {
      const objectId = uuidToObjectId(result.id);
      const event = events.find(e => e._id.toString() === objectId);
      if (event) {
        eventMap[result.id] = event;
      }
    });

    // Hybrid scoring
    const scoredEvents = vectorResults
      .filter((r) => eventMap[r.id])
      .map((result) => {
        const event = eventMap[result.id];
        const vectorScore = result.score * 100;

        // Popularity score (normalized)
        const popularityScore = Math.min(event.popularityScore || 0, 100);

        // Recency score (newer events get higher score)
        const ageInDays = (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 100 - ageInDays * 2);

        // Final hybrid score
        const finalScore =
          0.6 * vectorScore +
          0.2 * popularityScore +
          0.2 * recencyScore;

        return {
          ...event,
          recommendationScore: finalScore,
          breakdown: {
            vector: vectorScore,
            popularity: popularityScore,
            recency: recencyScore,
          },
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Personalized recommendations',
      coldStart: false,
      data: scoredEvents,
    });
  } catch (error) {
    console.error('Error getting user recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
};

/**
 * Get hotel recommendations for an event (planner perspective)
 */
/**
 * Core logic for getting hotel recommendations (can be reused)
 * @param {String} eventId - The event ID
 * @param {String} plannerId - The planner ID
 * @param {Number} limit - Number of recommendations
 * @returns {Array} - Scored hotel recommendations
 */
export const getHotelRecommendationsLogic = async (eventId, plannerId, limit = 10) => {
  // Fetch event
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Fetch event vector
  const eventVectorData = await retrieveVector(COLLECTIONS.EVENTS, eventId);
  if (!eventVectorData || !eventVectorData.vector) {
    // If no embeddings, fallback to rule-based recommendations
    console.warn('⚠️ No embeddings found for event, using rule-based fallback');
    const { generateHotelRecommendations } = await import('../services/hotelRecommendationService.js');
    const ruleBasedRecs = await generateHotelRecommendations(eventId);
    
    console.log('📊 Rule-based generated:', ruleBasedRecs.length, 'recommendations');
    
    // Fetch hotel details for rule-based recommendations
    const hotelIds = ruleBasedRecs.map(r => r.hotel);
    const hotels = await User.find({ _id: { $in: hotelIds } }).lean();
    
    const formattedRecs = ruleBasedRecs.map(rec => {
      const hotel = hotels.find(h => h._id.toString() === rec.hotel.toString());
      return {
        hotel,
        score: rec.score,
        breakdown: { total: rec.score },
        reasons: rec.reasons || []
      };
    }).filter(rec => rec.hotel).slice(0, limit);
    
    console.log('✅ Returning', formattedRecs.length, 'rule-based recommendations');
    return formattedRecs;
  }

  console.log('🎯 Event has embeddings, using AI-powered matching');

  // Fetch planner vector (if exists)
  const plannerVectorData = await retrieveVector(COLLECTIONS.PLANNERS, plannerId.toString());

  // Create search vector (combine event + planner preferences)
  let searchVector;
  if (plannerVectorData && plannerVectorData.vector) {
    // 70% event requirements, 30% planner preferences
    searchVector = combineVectors(eventVectorData.vector, plannerVectorData.vector, 0.7, 0.3);
    console.log('🔄 Combined event + planner vectors');
  } else {
    searchVector = eventVectorData.vector;
    console.log('📍 Using event vector only (no planner vector)');
  }

  // Search hotels (no payload filter - filter in app instead)
  const vectorResults = await searchVectors(
    COLLECTIONS.HOTELS,
    searchVector,
    50 // Get more for filtering
  );

  console.log('🔍 Vector search returned:', vectorResults.length, 'hotels');

  // Convert UUIDs back to ObjectIds and fetch hotel details
  const hotelIds = vectorResults.map((r) => uuidToObjectId(r.id));
  
  // First try with country filter
  let hotels = await User.find({
    _id: { $in: hotelIds },
    role: 'hotel',
    isActive: true,
    'location.country': event.location?.country, // Filter by country in MongoDB
  }).lean();

  console.log('🏨 Hotels after country filter:', hotels.length);

  // If no hotels found, try without country filter (for demo/testing)
  if (hotels.length === 0) {
    console.log('⚠️ No hotels in target country, expanding search to all countries');
    hotels = await User.find({
      _id: { $in: hotelIds },
      role: 'hotel',
      isActive: true,
    }).lean();
    console.log('🌍 Hotels after removing country filter:', hotels.length);
  }

  // Create hotel map (using original UUID for matching)
  const hotelMap = {};
  vectorResults.forEach((result) => {
    const objectId = uuidToObjectId(result.id);
    const hotel = hotels.find(h => h._id.toString() === objectId);
    if (hotel) {
      hotelMap[result.id] = hotel;
    }
  });

  // Hybrid scoring
  const scoredHotels = vectorResults
    .filter((r) => hotelMap[r.id])
    .map((result) => {
      const hotel = hotelMap[result.id];
      const vectorScore = result.score * 100;

      // Location score
      const locationScore = calculateLocationScore(hotel, event);

      // Budget score
      const budgetScore = calculateBudgetScore(hotel, event);

      // Capacity score
      const capacityScore = calculateCapacityScore(hotel, event);

      // Event type score
      const eventTypeScore = calculateEventTypeScore(hotel, event);

      // Final hybrid score
      const finalScore =
        0.4 * vectorScore +
        0.25 * locationScore +
        0.2 * budgetScore +
        0.1 * capacityScore +
        0.05 * eventTypeScore;

      return {
        hotel,
        score: finalScore,
        breakdown: {
          vector: vectorScore,
          location: locationScore,
          budget: budgetScore,
          capacity: capacityScore,
          eventType: eventTypeScore,
        },
        reasons: generateReasons(hotel, event, finalScore),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, parseInt(limit));

  console.log('✅ Returning', scoredHotels.length, 'AI-powered recommendations');
  return scoredHotels;
};

export const getHotelRecommendationsForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const plannerId = req.user._id;
    const { limit = 10 } = req.query;

    const scoredHotels = await getHotelRecommendationsLogic(eventId, plannerId, limit);

    res.status(200).json({
      success: true,
      data: scoredHotels,
    });
  } catch (error) {
    console.error('Error getting hotel recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hotel recommendations',
      error: error.message,
    });
  }
};

/**
 * Get trending events (cold start)
 */
async function getTrendingEvents(limit = 10) {
  const events = await Event.find({ status: 'active' })
    .sort({ popularityScore: -1, viewCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return events.map((event) => ({
    ...event,
    recommendationScore: event.popularityScore || 50,
    breakdown: {
      popularity: event.popularityScore || 50,
      trending: true,
    },
  }));
}

/**
 * Calculate location score
 */
function calculateLocationScore(hotel, event) {
  if (hotel.location.city === event.location.city) {
    return 100;
  }
  if (hotel.location.country === event.location.country) {
    return 50;
  }
  return 0;
}

/**
 * Calculate budget score
 */
function calculateBudgetScore(hotel, event) {
  if (!hotel.priceRange || !event.budgetRange) return 50;

  const hotelMin = hotel.priceRange.min || 0;
  const hotelMax = hotel.priceRange.max || Infinity;
  const eventMin = event.budgetRange.min || 0;
  const eventMax = event.budgetRange.max || Infinity;

  const eventAvg = (eventMin + eventMax) / 2;

  // Perfect match
  if (hotelMin <= eventAvg && hotelMax >= eventAvg) {
    return 100;
  }

  // Partial overlap
  if (hotelMax >= eventMin && hotelMin <= eventMax) {
    return 60;
  }

  // Close range
  const distance = Math.min(
    Math.abs(hotelMin - eventMax),
    Math.abs(hotelMax - eventMin)
  );
  if (distance < 5000) {
    return 30;
  }

  return 0;
}

/**
 * Calculate capacity score
 */
function calculateCapacityScore(hotel, event) {
  if (!hotel.totalRooms || !event.expectedGuests) return 50;

  const roomsNeeded = Math.ceil(event.expectedGuests / 2); // Assume 2 guests per room

  if (hotel.totalRooms >= roomsNeeded) {
    return 100;
  }

  if (hotel.totalRooms >= roomsNeeded * 0.7) {
    return 70;
  }

  return 30;
}

/**
 * Calculate event type score
 */
function calculateEventTypeScore(hotel, event) {
  if (!hotel.specialization || hotel.specialization.length === 0) return 50;

  if (hotel.specialization.includes(event.type)) {
    return 100;
  }

  return 30;
}

/**
 * Generate recommendation reasons
 */
function generateReasons(hotel, event, score) {
  const reasons = [];

  if (hotel.location.city === event.location.city) {
    reasons.push(`Located in ${event.location.city}`);
  } else if (hotel.location.country === event.location.country) {
    reasons.push(`Located in ${event.location.country}`);
  }

  if (hotel.priceRange && event.budgetRange) {
    const eventAvg = (event.budgetRange.min + event.budgetRange.max) / 2;
    if (hotel.priceRange.min <= eventAvg && hotel.priceRange.max >= eventAvg) {
      reasons.push('Pricing matches your budget');
    }
  }

  if (hotel.specialization && hotel.specialization.includes(event.type)) {
    reasons.push(`Specializes in ${event.type} events`);
  }

  if (hotel.totalRooms && event.expectedGuests) {
    const roomsNeeded = Math.ceil(event.expectedGuests / 2);
    if (hotel.totalRooms >= roomsNeeded) {
      reasons.push(`Can accommodate ${event.expectedGuests} guests`);
    }
  }

  if (score >= 80) {
    reasons.push('Excellent match for your event');
  } else if (score >= 60) {
    reasons.push('Good match for your event');
  }

  return reasons;
}

export default {
  getUserRecommendations,
  getHotelRecommendationsForEvent,
};
