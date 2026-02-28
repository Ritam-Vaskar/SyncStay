import Event from '../models/Event.js';
import User from '../models/User.js';
import { retrieveVector, searchVectors, COLLECTIONS, uuidToObjectId } from '../config/qdrant.js';
import { combineVectors } from '../services/embeddingService.js';
import { enrichHotelsWithTBO } from '../services/tboHotelEnrichmentService.js';
import { scoreFacilitiesWithGemini, buildFallbackScores } from '../services/geminiRecommendationService.js';
import { scoreHotelsForPlanner } from '../services/hybridScoringService.js';

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
  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  // ── Step 1: Build Qdrant search vector ──────────────────────────────────
  const [eventVectorData, plannerVectorData] = await Promise.all([
    retrieveVector(COLLECTIONS.EVENTS, eventId),
    retrieveVector(COLLECTIONS.PLANNERS, plannerId.toString()),
  ]);

  let searchVector = null;
  if (eventVectorData?.vector) {
    searchVector = plannerVectorData?.vector
      ? combineVectors(eventVectorData.vector, plannerVectorData.vector, 0.7, 0.3)
      : eventVectorData.vector;
    console.log('[Reco] Using ' + (plannerVectorData?.vector ? 'combined event+planner' : 'event-only') + ' vector');
  } else {
    console.warn('⚠️  [Reco] No event vector — falling back to rule-based');
    const { generateHotelRecommendations } = await import('../services/hotelRecommendationService.js');
    const ruleBasedRecs = await generateHotelRecommendations(eventId);
    const hotelIds = ruleBasedRecs.map(r => r.hotel);
    const hotels = await User.find({ _id: { $in: hotelIds } }).lean();
    return ruleBasedRecs
      .map(rec => ({ hotel: hotels.find(h => h._id.toString() === rec.hotel.toString()), score: rec.score, breakdown: { total: rec.score }, reasons: rec.reasons || [] }))
      .filter(r => r.hotel).slice(0, limit);
  }

  // ── Step 2: Vector search – pull candidates from BOTH collections ───────────
  // Note: no Qdrant payload filter (payload indexes not provisioned on cloud).
  // Country filtering happens in the MongoDB query below.

  // Search hotel profiles AND activity history in parallel
  const [profileResults, activityResults] = await Promise.all([
    searchVectors(COLLECTIONS.HOTELS, searchVector, 50),
    searchVectors(COLLECTIONS.HOTEL_ACTIVITY, eventVectorData.vector, 50).catch(() => []),
  ]);

  console.log(`🔍 [Reco] Profile: ${profileResults.length}  ActivityHistory: ${activityResults.length}`);

  // Merge both result sets (de-duplicate, keep best score from each)
  const candidateMap = {};
  for (const r of profileResults) {
    const id = uuidToObjectId(r.id);
    if (!candidateMap[id] || r.score > (candidateMap[id].profileScore || 0)) {
      candidateMap[id] = { ...(candidateMap[id] || {}), id, profileScore: r.score };
    }
  }
  for (const r of activityResults) {
    const id = uuidToObjectId(r.id);
    if (!candidateMap[id]) candidateMap[id] = { id };
    if (r.score > (candidateMap[id].activityScore || 0)) {
      candidateMap[id].activityScore = r.score;
    }
  }

  const candidateIds = Object.keys(candidateMap);
  const eventCountry = event.location?.country;
  const countryQuery = eventCountry ? { 'location.country': { $regex: new RegExp(eventCountry, 'i') } } : {};
  const hotels = await User.find({ _id: { $in: candidateIds }, role: 'hotel', isActive: true, ...countryQuery }).lean();
  console.log(`🏨 [Reco] ${hotels.length} hotels fetched from DB`);

  // ── Step 3: TBO enrichment ────────────────────────────────────────────────
  const enrichedHotels = await enrichHotelsWithTBO(hotels);

  // ── Step 4: Gemini facility scoring ─────────────────────────────────────────
  let geminiScores;
  try {
    geminiScores = await scoreFacilitiesWithGemini(enrichedHotels, event, []);
  } catch {
    geminiScores = buildFallbackScores(enrichedHotels, event, []);
  }

  // Inject pre-computed activity similarity into candidateMap for hybridScoringService
  // (scoreHotelsForPlanner will re-fetch from Qdrant but we already have the scores —
  //  override the Qdrant retrieve call by patching the hotel objects)
  for (const hotel of enrichedHotels) {
    const id = hotel._id.toString();
    hotel._precomputedActivityScore = candidateMap[id]?.activityScore != null
      ? candidateMap[id].activityScore * 100
      : null;
  }

  // ── Step 5: Hybrid blend + sort ───────────────────────────────────────────────
  const scored = await scoreHotelsForPlanner(
    enrichedHotels,
    event,
    geminiScores,
    eventVectorData.vector,
  );

  console.log(`✅ [Reco] Returning top ${Math.min(limit, scored.length)} recommendations`);
  return scored.slice(0, limit);
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
