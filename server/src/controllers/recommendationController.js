import Event from '../models/Event.js';
import User from '../models/User.js';
import { retrieveVector, searchVectors, COLLECTIONS, uuidToObjectId, VECTOR_SIZE } from '../config/qdrant.js';

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

    // Guard: treat stale vectors (wrong dims) the same as missing
    const userVector = userVectorData?.vector;
    const validVector = userVector && userVector.length === VECTOR_SIZE ? userVector : null;

    if (!validVector) {
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
      validVector,
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
 * ──────────────────────────────────────────────────────────────
 * ALL recommendation logic now lives in the Python ML server.
 * This function:
 *   1. Fetches event + all active hotels from MongoDB
 *   2. Resolves coordinates (location.coordinates or tboData)
 *   3. POSTs to ML server /hotel/recommend
 *   4. Maps the response back to the shape expected by the frontend
 */

const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:8020';

/**
 * Core logic for getting hotel recommendations (can be reused)
 * @param {String} eventId - The event ID
 * @param {String} plannerId - The planner ID (unused – kept for API compat)
 * @param {Number} limit - Number of recommendations
 * @returns {Array} - Scored hotel recommendations
 */
export const getHotelRecommendationsLogic = async (eventId, plannerId, limit = 10) => {
  const event = await Event.findById(eventId).populate('selectedHotels.hotel', 'name location tboData');
  if (!event) throw new Error('Event not found');

  // Fetch all active hotels
  const hotels = await User.find({ role: 'hotel', isActive: true }).lean();
  if (hotels.length === 0) return [];

  // ── Detect if a hotel is already selected ──────────────────────────
  // If planner already picked a hotel, we skip ML and sort remaining
  // by distance from the selected one (guests should stay nearby).
  let selectedHotelPayload = null;
  if (event.selectedHotels && event.selectedHotels.length > 0) {
    const sel = event.selectedHotels[0].hotel; // first selected hotel
    if (sel) {
      const selLat = sel.location?.coordinates?.latitude ?? sel.tboData?.latitude ?? null;
      const selLng = sel.location?.coordinates?.longitude ?? sel.tboData?.longitude ?? null;
      selectedHotelPayload = {
        id: sel._id.toString(),
        name: sel.name || 'Selected Hotel',
        latitude: selLat,
        longitude: selLng,
        city: sel.location?.city || '',
        country: sel.location?.country || '',
      };
      console.log(`🏨 [Reco] Hotel already selected: "${selectedHotelPayload.name}" — using distance mode (no ML)`);
    }
  }

  // Resolve event coordinates
  const eventLat = event.location?.coordinates?.latitude ?? null;
  const eventLng = event.location?.coordinates?.longitude ?? null;

  // Build hotel payload — resolve coordinates from location.coordinates or tboData
  const hotelPayload = hotels.map((h) => {
    const lat = h.location?.coordinates?.latitude ?? h.tboData?.latitude ?? null;
    const lng = h.location?.coordinates?.longitude ?? h.tboData?.longitude ?? null;

    return {
      id: h._id.toString(),
      name: h.name || h.organization || 'Hotel',
      latitude: lat,
      longitude: lng,
      city: h.location?.city || '',
      country: h.location?.country || '',
      totalRooms: h.totalRooms || 0,
      specialization: h.specialization || [],
      priceRange: h.priceRange || {},
      averageRating: h.averageRating || 0,
      eventsHostedCount: h.eventsHostedCount || 0,
    };
  });

  // Build event payload
  const eventPayload = {
    id: event._id.toString(),
    name: event.name || '',
    type: event.type || '',
    description: event.description || '',
    latitude: eventLat,
    longitude: eventLng,
    city: event.location?.city || '',
    country: event.location?.country || '',
  };

  console.log(`🤖 [Reco] Calling ML server for event "${event.name}" with ${hotelPayload.length} hotels`);
  console.log(`🤖 [Reco] Event payload:`, JSON.stringify(eventPayload));
  console.log(`🤖 [Reco] Sample hotel (first):`, JSON.stringify(hotelPayload[0]));

  // Call ML server
  const mlBody = {
    event: eventPayload,
    hotels: hotelPayload,
    radius_km: 5.0,
    limit,
  };
  // If a hotel is already selected, send it so ML server skips Qdrant
  if (selectedHotelPayload) {
    mlBody.selected_hotel = selectedHotelPayload;
  }

  const response = await fetch(`${ML_SERVER_URL}/hotel/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mlBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ML server error:', errorText);
    throw new Error(`ML server returned ${response.status}: ${errorText}`);
  }

  const mlResult = await response.json();
  console.log(`✅ [Reco] ML server returned ${mlResult.recommendations?.length || 0} recommendations (${mlResult.hotels_within_radius} within radius, total_candidates: ${mlResult.total_candidates})`);
  if (mlResult.recommendations?.length === 0) {
    console.log('⚠️  [Reco] No recommendations — full ML response:', JSON.stringify(mlResult));
  }

  // Map ML response to the shape expected by frontend/event controller
  const hotelMap = {};
  for (const h of hotels) {
    hotelMap[h._id.toString()] = h;
  }

  const scored = (mlResult.recommendations || []).map((rec) => {
    const hotel = hotelMap[rec.hotel_id];
    const similarityPct = Math.round((rec.similarity_score || 0) * 100);

    return {
      hotel: hotel || { _id: rec.hotel_id, name: rec.hotel_name },
      score: similarityPct,
      rank: rec.rank,
      isBestMatch: rec.is_best_match,
      isDistanceMode: !!selectedHotelPayload, // true when Mode B (no ML)
      breakdown: {
        similarity: similarityPct,
        distanceFromEvent: rec.distance_from_event_km,
        distanceFromBest: rec.distance_from_best_km,
      },
      reasons: rec.reasons || [],
    };
  });

  return scored;
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

export default {
  getUserRecommendations,
  getHotelRecommendationsForEvent,
};
