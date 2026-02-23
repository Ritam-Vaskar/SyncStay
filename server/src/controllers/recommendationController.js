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

  // Build Qdrant filter for hard constraints
  const qdrantFilter = {
    must: [
      // Country filter (case-insensitive via normalization at data entry)
      { key: 'country', match: { value: event.location?.country || 'India' } },
    ]
  };

  console.log('🔍 Searching with filters:', JSON.stringify(qdrantFilter));

  // Search hotels with Qdrant payload filters
  const vectorResults = await searchVectors(
    COLLECTIONS.HOTELS,
    searchVector,
    50, // Get more candidates
    qdrantFilter
  );

  console.log('🔍 Vector search returned:', vectorResults.length, 'hotels from', event.location?.country);

  // Convert UUIDs back to ObjectIds and fetch hotel details
  const hotelIds = vectorResults.map((r) => uuidToObjectId(r.id));
  
  // Fetch hotels with minimal filtering (Qdrant already filtered by country)
  let hotels = await User.find({
    _id: { $in: hotelIds },
    role: 'hotel',
    isActive: true,
  }).lean();

  console.log('🏨 Hotels fetched from database:', hotels.length);

  // Create hotel map (using original UUID for matching)
  const hotelMap = {};
  vectorResults.forEach((result) => {
    const objectId = uuidToObjectId(result.id);
    const hotel = hotels.find(h => h._id.toString() === objectId);
    if (hotel) {
      hotelMap[result.id] = hotel;
    }
  });

  // AI-First Hybrid scoring: Trust the embeddings!
  const scoredHotels = vectorResults
    .filter((r) => hotelMap[r.id])
    .map((result) => {
      const hotel = hotelMap[result.id];
      
      // Primary signal: AI vector similarity (0-100)
      const aiScore = result.score * 100;

      // Minimal logical checks for critical constraints only
      const capacityBonus = calculateCapacityBonus(hotel, event);
      const cityMatchBonus = calculateCityBonus(hotel, event);

      // AI-first scoring: 75% AI, 15% capacity match, 10% city exact match
      const finalScore = (0.75 * aiScore) + (0.15 * capacityBonus) + (0.10 * cityMatchBonus);

      return {
        hotel,
        score: finalScore,
        breakdown: {
          aiSimilarity: aiScore,
          capacityMatch: capacityBonus,
          cityMatch: cityMatchBonus,
          total: finalScore,
        },
        reasons: generateAIReasons(hotel, event, aiScore, capacityBonus, cityMatchBonus),
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
 * Calculate capacity bonus (0-100)
 * Critical constraint: Can the hotel physically accommodate guests?
 */
function calculateCapacityBonus(hotel, event) {
  if (!hotel.totalRooms || !event.expectedGuests) return 50; // Neutral if unknown

  const roomsNeeded = Math.ceil(event.expectedGuests / 2); // Assume 2 guests per room

  if (hotel.totalRooms >= roomsNeeded) {
    return 100; // Perfect capacity
  }

  if (hotel.totalRooms >= roomsNeeded * 0.7) {
    return 70; // Can accommodate most guests
  }

  return 30; // Insufficient capacity
}

/**
 * Calculate city match bonus (0-100)
 * Small bonus for exact city match (AI already handles location semantically)
 */
function calculateCityBonus(hotel, event) {
  if (!hotel.location?.city || !event.location?.city) return 50;

  // Case-insensitive comparison
  const hotelCity = hotel.location.city.toLowerCase().trim();
  const eventCity = event.location.city.toLowerCase().trim();

  if (hotelCity === eventCity) {
    return 100; // Exact city match
  }

  // Check if cities contain each other (e.g., "New Delhi" contains "Delhi")
  if (hotelCity.includes(eventCity) || eventCity.includes(hotelCity)) {
    return 80; // Close match
  }

  return 50; // Different city (country filter already applied)
}

/**
 * Generate AI-driven recommendation reasons
 */
function generateAIReasons(hotel, event, aiScore, capacityBonus, cityBonus) {
  const reasons = [];

  // Primary reason: AI match quality
  if (aiScore >= 80) {
    reasons.push('🎯 Excellent AI match for your event requirements');
  } else if (aiScore >= 60) {
    reasons.push('✅ Good AI match for your event type and needs');
  } else if (aiScore >= 40) {
    reasons.push('👌 Suitable match based on event criteria');
  }

  // Location  
  if (cityBonus === 100) {
    reasons.push(`📍 Located in ${event.location?.city}`);
  } else if (cityBonus >= 80) {
    reasons.push(`📍 Near ${event.location?.city}`);
  } else {
    reasons.push(`🌍 Available in ${hotel.location?.country || 'your country'}`);
  }

  // Capacity
  if (capacityBonus === 100 && event.expectedGuests) {
    reasons.push(`👥 Can accommodate all ${event.expectedGuests} guests`);
  } else if (capacityBonus >= 70 && event.expectedGuests) {
    reasons.push(`👥 Can accommodate most of your ${event.expectedGuests} guests`);
  }

  // Hotel quality indicators
  if (hotel.averageRating >= 4) {
    reasons.push(`⭐ Highly rated (${hotel.averageRating}/5)`);
  }

  if (hotel.eventsHostedCount > 10) {
    reasons.push(`🏆 Experienced (hosted ${hotel.eventsHostedCount}+ events)`);
  }

  // Event type specialization (from AI + metadata)
  if (hotel.specialization?.includes(event.type)) {
    reasons.push(`🎪 Specializes in ${event.type} events`);
  }

  return reasons;
}

export default {
  getUserRecommendations,
  getHotelRecommendationsForEvent,
};
