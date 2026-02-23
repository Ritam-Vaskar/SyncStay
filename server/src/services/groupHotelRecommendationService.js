import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import InventoryGroup from '../models/InventoryGroup.js';
import mongoose from 'mongoose';
import { retrieveVector, searchVectors, COLLECTIONS, uuidToObjectId } from '../config/qdrant.js';
import { enrichHotelsWithTBO, getMergedFacilities } from './tboHotelEnrichmentService.js';
import { scoreFacilitiesWithGemini, buildFallbackScores } from './geminiRecommendationService.js';
import { scoreHotelsForGroups } from './hybridScoringService.js';

/**
 * Get guest's past booking history
 */
export const getGuestBookingHistory = async (guestEmail) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { 'guestDetails.email': guestEmail },
      ],
    })
      .populate('event', 'type startDate endDate location')
      .populate('inventory', 'hotelName pricePerNight')
      .sort({ createdAt: -1 })
      .limit(10);

    return bookings;
  } catch (error) {
    console.error('Error fetching guest booking history:', error);
    return [];
  }
};

/**
 * Extract guest's budget preferences from past events
 */
export const getGuestBudgetPreferences = async (guestEmail) => {
  try {
    const bookings = await Booking.find({
      'guestDetails.email': guestEmail,
      status: { $in: ['confirmed', 'checked-in', 'checked-out'] },
    }).select('pricing.pricePerNight pricing.totalAmount');

    if (bookings.length === 0) return null;

    const pricesPerNight = bookings
      .map((b) => b.pricing?.pricePerNight || 0)
      .filter((p) => p > 0);
    const avgPrice = pricesPerNight.length
      ? pricesPerNight.reduce((a, b) => a + b) / pricesPerNight.length
      : 0;

    return {
      averagePerNight: avgPrice,
      min: Math.min(...pricesPerNight),
      max: Math.max(...pricesPerNight),
      totalBookings: bookings.length,
    };
  } catch (error) {
    console.error('Error fetching budget preferences:', error);
    return null;
  }
};

/**
 * Determine hotel category (budget, mid-range, luxury) based on pricing
 */
const getHotelCategory = (hotel) => {
  if (!hotel.priceRange?.min) return 'unknown';
  const avgPrice = (hotel.priceRange.min + (hotel.priceRange.max || hotel.priceRange.min)) / 2;
  
  if (avgPrice < 3000) return 'budget';
  if (avgPrice < 8000) return 'mid-range';
  return 'luxury';
};

/**
 * Score hotel for PUBLIC events - EMBEDDING SIMILARITY ONLY
 * Score is primarily based on semantic similarity from Qdrant embeddings
 */
const scoreHotelForPublicEvent = (hotel, event, group, groupMemberHistories, embeddingScore = 0) => {
  let score = embeddingScore; // Start with embedding similarity (0-30)
  const reasons = [];

  if (embeddingScore > 15) {
    reasons.push('Strong semantic match with event requirements');
  } else if (embeddingScore > 8) {
    reasons.push('Good semantic match with event needs');
  } else if (embeddingScore > 0) {
    reasons.push('Semantic match found with event');
  }

  // Only add minimal capacity check as fallback (max 5 points)
  if (hotel.totalRooms && group.number && group.number > 0) {
    const estimatedRoomsNeeded = Math.ceil(group.number / 2);
    if (hotel.totalRooms >= estimatedRoomsNeeded) {
      score += 5;
      reasons.push(`Sufficient capacity for ${group.number} people`);
    }
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
};

/**
 * Score hotel for PRIVATE events - EMBEDDING SIMILARITY ONLY
 * Score is primarily based on semantic similarity from Qdrant embeddings
 */
const scoreHotelForPrivateEvent = (hotel, event, group, groupMemberHistories, embeddingScore = 0) => {
  let score = embeddingScore; // Start with embedding similarity (0-30)
  const reasons = [];

  if (embeddingScore > 15) {
    reasons.push('Strong semantic match with private event requirements');
  } else if (embeddingScore > 8) {
    reasons.push('Good semantic match for your event');
  } else if (embeddingScore > 0) {
    reasons.push('Semantic match aligned with event type');
  }

  // Only add minimal capacity check as fallback (max 5 points)
  if (hotel.totalRooms && group.number && group.number > 0) {
    const estimatedRoomsNeeded = Math.ceil(group.number / 2);
    if (hotel.totalRooms >= estimatedRoomsNeeded) {
      score += 5;
      reasons.push(`Capacity available for ${group.number} guests`);
    }
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
};

/**
 * Score a hotel for a group with EVENT-TYPE-AWARE scoring
 */
export const scoreHotelForGroup = async (eventId, groupId, hotelId) => {
  try {
    const event = await Event.findById(eventId);
    const group = await InventoryGroup.findById(groupId);
    const hotel = await User.findById(hotelId);

    if (!event || !group || !hotel) throw new Error('Missing event, group, or hotel');

    // Get member booking histories
    const groupMemberHistories = await Promise.all(
      group.members.map(async (member) => {
        const history = await getGuestBookingHistory(member.guestEmail);
        const count = history.filter(
          (b) => b.inventory?.hotelName?.toLowerCase() === hotel.name?.toLowerCase()
        ).length;
        return { email: member.guestEmail, count };
      })
    );

    // Apply different scoring based on event type
    let scoreResult;
    if (event.isPrivate) {
      scoreResult = scoreHotelForPrivateEvent(hotel, event, group, groupMemberHistories);
    } else {
      scoreResult = scoreHotelForPublicEvent(hotel, event, group, groupMemberHistories);
    }

    return {
      hotelId: hotel._id,
      hotelName: hotel.name,
      groupScore: scoreResult.score,
      reasons: scoreResult.reasons,
      reasonCategory: event.isPrivate ? 'private-event' : 'public-event',
    };
  } catch (error) {
    console.error('Error scoring hotel for group:', error);
    throw error;
  }
};

/**
 * Score hotel for individual guest (personalized based on personal history & budget)
 */
export const scoreHotelForGuest = async (eventId, guestEmail, hotelId) => {
  try {
    const event = await Event.findById(eventId);
    const hotel = await User.findById(hotelId);
    const budgetPrefs = await getGuestBudgetPreferences(guestEmail);
    const bookingHistory = await getGuestBookingHistory(guestEmail);

    if (!event || !hotel) throw new Error('Missing event or hotel');

    let score = 0;
    const reasons = [];

    // 1. Personal booking history (40 points max) - MOST IMPORTANT for individual
    const previousStays = bookingHistory.filter(
      (b) => b.inventory?.hotelName?.toLowerCase() === hotel.name?.toLowerCase()
    ).length;

    if (previousStays > 0) {
      score += Math.min(previousStays * 10, 40);
      reasons.push(`You've stayed here ${previousStays} time(s) before`);
    }

    // 2. Budget preference (25 points)
    if (budgetPrefs && hotel.priceRange?.min) {
      const hotelAvgPrice = (hotel.priceRange.min + (hotel.priceRange.max || hotel.priceRange.min)) / 2;
      const priceDiff = Math.abs(hotelAvgPrice - budgetPrefs.averagePerNight);
      const tolerance = budgetPrefs.averagePerNight * 0.25;

      if (priceDiff <= tolerance) {
        score += 25;
        reasons.push('Price matches your typical budget');
      } else if (hotelAvgPrice < budgetPrefs.averagePerNight) {
        score += 12;
        reasons.push('More affordable than your usual choice');
      }
    }

    // 3. Location (20 points)
    if (hotel.location?.city && event.location?.city) {
      if (hotel.location.city.toLowerCase() === event.location.city.toLowerCase()) {
        score += 20;
        reasons.push('Convenient location for event');
      }
    }

    // 4. Amenities matching (15 points)
    if (hotel.facilities && Array.isArray(hotel.facilities) && hotel.facilities.length > 0) {
      const preferredAmenities = ['gym', 'wifi', 'pool', 'restaurant', 'bar', 'spa'];
      const matches = hotel.facilities.filter(f =>
        preferredAmenities.some(pa => f?.toLowerCase().includes(pa))
      ).length;

      if (matches > 2) {
        score += Math.min(matches * 5, 15);
        reasons.push(`Has ${matches} amenities you prefer`);
      }
    }

    return {
      hotelId: hotel._id,
      hotelName: hotel.name,
      personalScore: Math.min(score, 100),
      reasons,
      reasonCategory: 'personal-preference',
    };
  } catch (error) {
    console.error('Error scoring hotel for guest:', error);
    throw error;
  }
};

/**
 * Retrieve event vector from Qdrant (used for activity cosine similarity).
 * Returns null when the event has never been embedded.
 */
const getEventVector = async (eventId) => {
  try {
    const result = await retrieveVector(COLLECTIONS.EVENTS, eventId.toString());
    return result?.vector || null;
  } catch {
    return null;
  }
};

/**
 * Rank all selected hotels for an event — HYBRID PIPELINE
 *
 * Step 1  : Enrich hotels with real TBO facility/description data.
 * Step 2  : Single Gemini call → per-group + event-level facility scores.
 * Step 3  : Pull event embedding + each hotel's activity-history vector from Qdrant.
 * Step 4  : Hybrid blend per group  (50% Gemini + 35% activity + 10% capacity + 5% city).
 * Step 5  : Individual scoring     (40% Gemini + 30% activity + personal history bonuses).
 */
export const rankHotelsForEvent = async (eventId) => {
  try {
    const [event, groups] = await Promise.all([
      Event.findById(eventId).populate('selectedHotels.hotel'),
      InventoryGroup.find({ event: eventId }),
    ]);

    const raw = event?.selectedHotels || [];
    console.log(`\n🏨 rankHotelsForEvent  event=${event?.name}  hotels=${raw.length}  groups=${groups.length}`);

    if (raw.length === 0 || groups.length === 0) {
      return { groupRecommendations: [], individualRecommendations: {} };
    }

    // Extract hotel objects (already populated)
    const hotels = raw.map(sh => sh.hotel).filter(Boolean);

    // ── Step 1: TBO enrichment ──────────────────────────────────────────────
    console.log('📡 [1/4] Enriching hotels with TBO data...');
    const enrichedHotels = await enrichHotelsWithTBO(hotels);
    console.log(`   TBO-enriched: ${enrichedHotels.filter(h => h._tboEnriched).length}/${enrichedHotels.length}`);

    // ── Step 2: Gemini facility + group scoring ─────────────────────────────
    console.log('🤖 [2/4] Calling Gemini for facility fit scoring...');
    let geminiScores;
    try {
      geminiScores = await scoreFacilitiesWithGemini(enrichedHotels, event, groups);
    } catch (err) {
      console.warn('⚠️  Gemini call failed, using rule-based fallback:', err.message);
      geminiScores = buildFallbackScores(enrichedHotels, event, groups);
    }

    // ── Step 3: Retrieve event vector + hotel activity vectors ──────────────
    console.log('🔍 [3/4] Retrieving activity vectors from Qdrant...');
    const eventVector = await getEventVector(eventId);
    if (eventVector) {
      console.log('   ✅ Event vector found');
    } else {
      console.log('   ⚠️  Event vector not in Qdrant — activity scoring will use neutral 50');
    }

    // ── Step 4: Group recommendations via hybridScoringService ─────────────
    console.log('🧮 [4/4] Computing hybrid group scores...');
    const groupRecommendations = await scoreHotelsForGroups(
      enrichedHotels,
      event,
      groups,
      geminiScores,
      eventVector,
    );

    // ── Step 5: Individual guest recommendations ────────────────────────────
    const individualRecommendations = {};
    for (const group of groups) {
      for (const member of group.members) {
        const bookingHistory = await getGuestBookingHistory(member.guestEmail);

        // Build per-hotel individual scores
        const guestScores = enrichedHotels.map(hotel => {
          const hotelId = hotel._id.toString();

          // Gemini event-level score as anchor (40%)
          const geminiEventScore = geminiScores?.eventScores?.[hotelId]?.score || 50;

          // Personal history bonus (max 20)
          const stays = bookingHistory.filter(
            b => b.inventory?.hotelName?.toLowerCase() === hotel.name?.toLowerCase()
          ).length;
          const historyBonus = Math.min(stays * 10, 20);

          // Amenity bonus (max 10)
          const facilities = getMergedFacilities(hotel);
          const preferred = ['wifi', 'pool', 'gym', 'spa', 'restaurant', 'bar'];
          const amenityMatches = facilities.filter(f => preferred.some(p => f.includes(p))).length;
          const amenityBonus = Math.min(amenityMatches * 2, 10);

          const personalScore = Math.min(
            Math.round((0.70 * geminiEventScore) + historyBonus + amenityBonus),
            100,
          );

          const reasons = [...(geminiScores?.eventScores?.[hotelId]?.reasons?.slice(0, 2) || [])];
          if (stays > 0) reasons.push(`You've stayed here ${stays} time(s) before`);
          if (amenityMatches > 2) reasons.push(`${amenityMatches} preferred amenities`);

          return {
            hotelId: hotel._id,
            hotelName: hotel.name,
            personalScore,
            reasons,
            reasonCategory: 'personal-preference',
            hotel,
          };
        });

        guestScores.sort((a, b) => b.personalScore - a.personalScore);
        individualRecommendations[member.guestEmail] = {
          guestName: member.guestName,
          groupId: group._id,
          groupName: group.name,
          hotels: guestScores.slice(0, 3),
        };
      }
    }

    return { groupRecommendations, individualRecommendations };
  } catch (error) {
    console.error('Error ranking hotels:', error);
    throw error;
  }
};
