import Event from '../models/Event.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import InventoryGroup from '../models/InventoryGroup.js';
import mongoose from 'mongoose';
import { retrieveVector, searchVectors, COLLECTIONS, uuidToObjectId } from '../config/qdrant.js';

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
 * Get semantic similarity scores between event and hotels using Qdrant embeddings
 * This compares event requirements with hotel capabilities at semantic level
 */
const getEmbeddingSimilarityScores = async (eventId, hotelIds) => {
  try {
    // Try to retrieve the event vector from Qdrant
    const eventVector = await retrieveVector(COLLECTIONS.EVENTS, eventId);
    
    if (!eventVector || !eventVector.vector) {
      console.log('⚠️  Event embedding not found in Qdrant, skipping semantic matching');
      return {};
    }

    console.log(`📡 Event embedding found. Searching similar hotels...`);
    const hotelIdStrings = hotelIds.map(id => id.toString());
    console.log(`   Selected hotel IDs (${hotelIds.length}):`, hotelIdStrings);

    const similarityScores = {};

    // Search for hotels similar to the event in Qdrant
    const searchResults = await searchVectors(
      COLLECTIONS.HOTELS,
      eventVector.vector,
      Math.max(hotelIds.length * 5, 20) // Search for 5x hotels to get better coverage
    );

    console.log(`📊 Qdrant search returned ${searchResults.length} results`);

    // Build a similarity score map by converting UUID back to ObjectId
    // Keep track of best match for each selected hotel
    const bestScorePerHotel = {};
    
    for (const result of searchResults) {
      // Convert UUID ID back to MongoDB ObjectId
      const convertedId = uuidToObjectId(result.id);
      
      // Find exact match in selected hotels
      for (const hidStr of hotelIdStrings) {
        if (hidStr === convertedId) {
          // Direct match found
          if (!bestScorePerHotel[hidStr] || result.score > bestScorePerHotel[hidStr].score) {
            bestScorePerHotel[hidStr] = { id: convertedId, score: result.score };
            console.log(`   ✅ EXACT MATCH: ${hidStr} -> score=${result.score.toFixed(4)}`);
          }
          break;
        }
      }
    }

    // Convert best scores to point values
    for (const [hidStr, scoreData] of Object.entries(bestScorePerHotel)) {
      const similarities = (scoreData.score || 0) * 30;
      similarityScores[hidStr] = similarities;
    }

    console.log(`🔍 Embedding bonus scores applied to ${Object.keys(similarityScores).length}/${hotelIdStrings.length} hotels`);
    console.log('   Scores:', similarityScores);
    return similarityScores;
  } catch (error) {
    console.error('⚠️  Error getting embedding similarity scores:', error.message);
    // Return empty scores, fallback to rule-based scoring only
    return {};
  }
};

/**
 * Rank all selected hotels for an event with group + individual recommendations
 */
export const rankHotelsForEvent = async (eventId) => {
  try {
    // Fetch event with POPULATED hotel details
    const event = await Event.findById(eventId).populate('selectedHotels.hotel');
    const groups = await InventoryGroup.find({ event: eventId });
    const selectedHotels = event?.selectedHotels || [];

    console.log('Event:', event?.name, 'isPrivate:', event?.isPrivate);
    console.log('Selected Hotels:', selectedHotels.length);
    console.log('Groups:', groups.length);

    if (selectedHotels.length === 0 || groups.length === 0) {
      return { groupRecommendations: [], individualRecommendations: {} };
    }

    // Get embedding similarity scores from Qdrant for all selected hotels
    const hotelIds = selectedHotels
      .map(sh => {
        const id = sh.hotel?._id || sh.hotel;
        console.log(`   Hotel ID extracted: ${id} (type: ${typeof id})`);
        return id;
      });
    
    console.log(`📋 Hotel IDs for embedding search:`, hotelIds.map(id => id.toString()));
    const embeddingSimilarityScores = await getEmbeddingSimilarityScores(eventId, hotelIds);

    // Score hotels for each group with EVENT-TYPE awareness + EMBEDDING SIMILARITY
    const groupRecommendations = [];
    for (const group of groups) {
      const groupScores = [];

      for (const selectedHotel of selectedHotels) {
        const hotelId = selectedHotel.hotel?._id || selectedHotel.hotel;
        
        // Get member booking histories
        const groupMemberHistories = await Promise.all(
          group.members.map(async (member) => {
            const history = await getGuestBookingHistory(member.guestEmail);
            const count = history.filter(
              (b) => b.inventory?.hotelName?.toLowerCase() === selectedHotel.hotel?.name?.toLowerCase()
            ).length;
            return { email: member.guestEmail, count };
          })
        );

        // Get the hotel details
        const hotel = selectedHotel.hotel || await User.findById(hotelId);

        // Get embedding score for this hotel
        const hotelIdString = hotel._id.toString();
        const embeddingScore = embeddingSimilarityScores[hotelIdString] || 0;

        // Apply scoring based on event type - EMBEDDING SIMILARITY ONLY
        let scoreResult;
        if (event.isPrivate) {
          scoreResult = scoreHotelForPrivateEvent(hotel, event, group, groupMemberHistories, embeddingScore);
        } else {
          scoreResult = scoreHotelForPublicEvent(hotel, event, group, groupMemberHistories, embeddingScore);
        }

        const groupScore = scoreResult.score; // Pure embedding + minimal capacity check

        groupScores.push({
          hotelId: hotel._id,
          hotelName: hotel.name,
          groupScore: groupScore, // Embedding-based score
          ruleBasedScore: scoreResult.score,
          embeddingScore: embeddingScore,
          reasons: scoreResult.reasons,
          reasonCategory: event.isPrivate ? 'private-event' : 'public-event',
          hotel: hotel, // Include full hotel object
        });

        console.log(`  ${hotel.name}: embedding=${embeddingScore.toFixed(2)} + capacity=${scoreResult.score - embeddingScore > 0 ? '+' + (scoreResult.score - embeddingScore).toFixed(2) : '0'} = ${groupScore.toFixed(2)}`);
      }

      // Sort by combined score descending
      groupScores.sort((a, b) => b.groupScore - a.groupScore);
      groupRecommendations.push({
        groupId: group._id,
        groupName: group.name,
        eventType: event.isPrivate ? 'private' : 'public',
        hotels: groupScores.slice(0, 3), // Top 3 recommendations
      });

      console.log(`${group.name} recommendations:`, groupScores.slice(0, 1).map(s => ({ hotel: s.hotelName, score: s.groupScore })));
    }

    // Score hotels for each individual guest (personalized) - EMBEDDING SIMILARITY ONLY
    const individualRecommendations = {};
    for (const group of groups) {
      for (const member of group.members) {
        const guestRecommendations = [];

        for (const selectedHotel of selectedHotels) {
          const hotelId = selectedHotel.hotel?._id || selectedHotel.hotel;
          const hotel = selectedHotel.hotel || await User.findById(hotelId);
          
          // Get embedding score for this hotel
          const hotelIdForLookup = hotel._id.toString();
          const embeddingScore = embeddingSimilarityScores[hotelIdForLookup] || 0;

          let score = embeddingScore;
          const reasons = [];

          if (embeddingScore > 15) {
            reasons.push('Strong semantic match with your preferences');
          } else if (embeddingScore > 8) {
            reasons.push('Good semantic match');
          } else if (embeddingScore > 0) {
            reasons.push('Semantic preference match');
          }

          // Minimal fallback: basic amenity check (max 3 points)
          if (hotel.facilities && Array.isArray(hotel.facilities) && hotel.facilities.length > 0) {
            const basicAmenities = ['wifi', 'restaurant', 'gym'];
            const matches = hotel.facilities.filter(f =>
              basicAmenities.some(ba => f?.toLowerCase().includes(ba))
            ).length;

            if (matches > 0) {
              score += Math.min(matches, 3);
              reasons.push(`Has ${matches} essential amenities`);
            }
          }

          guestRecommendations.push({
            hotelId: hotel._id,
            hotelName: hotel.name,
            personalScore: Math.min(score, 100),
            embeddingScore,
            reasons,
            reasonCategory: 'embedding-match',
            hotel: hotel,
          });
        }

        guestRecommendations.sort((a, b) => b.personalScore - a.personalScore);
        individualRecommendations[member.guestEmail] = {
          guestName: member.guestName,
          groupId: group._id,
          groupName: group.name,
          hotels: guestRecommendations.slice(0, 3), // Top 3 recommendations
        };
      }
    }

    return {
      groupRecommendations,
      individualRecommendations,
    };
  } catch (error) {
    console.error('Error ranking hotels:', error);
    throw error;
  }
};
