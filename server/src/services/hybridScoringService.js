/**
 * Hybrid Scoring Service
 *
 * Blends two recommendation signals:
 *  1. Gemini LLM  — real TBO facility + description fit (immediate, qualitative)
 *  2. Qdrant activity vector — historical event type match (learned from past events)
 *
 * For the PLANNER hotel search (many candidates):
 *   finalScore = 0.45 × geminiEventScore
 *              + 0.40 × activityHistoryScore
 *              + 0.10 × capacityBonus
 *              + 0.05 × cityMatchBonus
 *
 * For GROUP inventory recommendations (3–6 pre-selected hotels):
 *   finalScore = 0.50 × geminiGroupScore
 *              + 0.35 × activityHistoryScore
 *              + 0.10 × capacityBonus
 *              + 0.05 × locationBonus
 */
import { retrieveVector, COLLECTIONS } from '../config/qdrant.js';
import { cosineSimilarity } from './embeddingService.js';
import { getMergedFacilities } from './tboHotelEnrichmentService.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function capacityBonus(hotel, requiredGuests) {
  if (!hotel.totalRooms || !requiredGuests) return 50; // neutral unknown
  const roomsNeeded = Math.ceil(requiredGuests / 2);
  if (hotel.totalRooms >= roomsNeeded) return 100;
  if (hotel.totalRooms >= roomsNeeded * 0.7) return 70;
  return 30;
}

function cityMatchBonus(hotel, event) {
  const hCity = (hotel.location?.city || '').toLowerCase();
  const eCity = (event.location?.city || '').toLowerCase();
  if (!hCity || !eCity) return 50;
  if (hCity === eCity) return 100;
  if (hCity.includes(eCity) || eCity.includes(hCity)) return 80;
  return 30;
}

/**
 * Retrieve the activity history vector for a hotel from Qdrant.
 * Returns null if not found (hotel has no history yet).
 */
async function getActivityVector(hotelId) {
  try {
    const data = await retrieveVector(COLLECTIONS.HOTEL_ACTIVITY, hotelId.toString());
    return data?.vector || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Planner search: event-level hybrid scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a list of hotels for a planner event search.
 * Combines Gemini facility scores + Qdrant activity similarity.
 *
 * @param {Array<Object>} hotels           — candidate hotel objects (TBO-enriched)
 * @param {Object}        event            — Event document
 * @param {Object}        geminiScores     — { eventScores: { hotelId: { score, reasons } } }
 * @param {number[]}      eventVector      — event embedding vector from Qdrant
 * @returns {Promise<Array<{ hotel, score, breakdown, reasons }>>}
 */
export async function scoreHotelsForPlanner(hotels, event, geminiScores, eventVector) {
  const results = [];

  for (const hotel of hotels) {
    const hotelId = hotel._id?.toString();

    // 1. Gemini facility score (0–100)
    const geminiData = geminiScores?.eventScores?.[hotelId] || { score: 50, reasons: [] };
    const geminiScore = geminiData.score;

    // 2. Activity history score (0–100) via cosine similarity
    // Prefer pre-computed score injected by recommendationController to avoid a second Qdrant round-trip
    let activityScore = 50; // neutral when no history
    if (hotel._precomputedActivityScore != null) {
      activityScore = hotel._precomputedActivityScore;
    } else if (eventVector) {
      const activityVector = await getActivityVector(hotelId);
      if (activityVector) {
        try {
          activityScore = cosineSimilarity(eventVector, activityVector) * 100;
        } catch { /* dimension mismatch — keep neutral */ }
      }
    }

    // 3. Capacity & city bonuses (0–100 each)
    const capBonus = capacityBonus(hotel, event.expectedGuests);
    const cityBonus = cityMatchBonus(hotel, event);

    // Weighted blend
    const finalScore =
      (0.45 * geminiScore) +
      (0.40 * activityScore) +
      (0.10 * capBonus) +
      (0.05 * cityBonus);

    // Combine reasons
    const reasons = [...(geminiData.reasons || [])];
    if (activityScore > 70) reasons.push('Strong history of similar events at this hotel');
    else if (activityScore > 55) reasons.push('Has hosted events of similar type before');
    if (capBonus === 100) reasons.push('Sufficient capacity for expected guests');
    if (cityBonus === 100) reasons.push('Located in the event city');

    results.push({
      hotel,
      score: Math.round(finalScore),
      breakdown: {
        gemiliFacilityScore: Math.round(geminiScore),
        activityHistoryScore: Math.round(activityScore),
        capacityMatch: Math.round(capBonus),
        cityMatch: Math.round(cityBonus),
        total: Math.round(finalScore),
      },
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Group inventory: per-group hybrid scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score 3–6 pre-selected hotels for each guest group.
 * Each group gets a genuinely different hotel ranking.
 *
 * @param {Array<Object>} hotels           — TBO-enriched selected hotels
 * @param {Object}        event            — Event document
 * @param {Array<Object>} groups           — InventoryGroup documents
 * @param {Object}        geminiScores     — { eventScores, groupScores }
 * @param {number[]}      eventVector      — event embedding vector (may be null)
 * @returns {Promise<Array<{ groupId, groupName, groupType, hotels: [] }>>}
 */
export async function scoreHotelsForGroups(hotels, event, groups, geminiScores, eventVector) {
  // Pre-fetch activity vectors for all hotels (parallel)
  const activityVectors = {};
  await Promise.all(hotels.map(async (h) => {
    activityVectors[h._id?.toString()] = await getActivityVector(h._id);
  }));

  console.log('\n' + '═'.repeat(70));
  console.log(`📊 INVENTORY RECOMMENDATION — Event: "${event.name}" (${event.type || 'general'})`);
  console.log(`   Hotels in pool : ${hotels.map(h => h.name).join(', ')}`);
  console.log(`   Groups         : ${groups.map(g => g.name + ' (' + (g.relationshipType || g.type || 'general') + ')').join(', ')}`);
  console.log(`   AI scoring     : ${geminiScores?.eventScores ? 'ACTIVE' : 'FALLBACK/RULE-BASED'}`);
  console.log(`   Activity vector: ${eventVector ? 'FOUND' : 'NOT FOUND — using neutral 50'}`);
  console.log('═'.repeat(70));

  const groupRecommendations = [];

  for (const group of groups) {
    const groupId = group._id?.toString();
    const groupScores = [];

    console.log(`\n── GROUP: "${group.name}" | Type: ${group.relationshipType || group.type || 'general'} | Size: ${group.number || group.members?.length || '?'} guests`);

    for (const hotel of hotels) {
      const hotelId = hotel._id?.toString();

      // 1. Gemini score for this specific group × hotel (0–100)
      const gScore = geminiScores?.groupScores?.[groupId]?.[hotelId] || { score: 50, reasons: [] };
      const geminiGroupScore = gScore.score;

      // 2. Activity history vs event type (0–100)
      let activityScore = 50;
      if (eventVector) {
        const av = activityVectors[hotelId];
        if (av) {
          try { activityScore = cosineSimilarity(eventVector, av) * 100; } catch { /* skip */ }
        }
      }

      // 3. Capacity for this group's size
      const capBonus = capacityBonus(hotel, group.number || group.members?.length || 0);

      // 4. City match
      const cityBonus = cityMatchBonus(hotel, event);

      const finalScore =
        (0.50 * geminiGroupScore) +
        (0.35 * activityScore) +
        (0.10 * capBonus) +
        (0.05 * cityBonus);

      const reasons = [...(gScore.reasons || [])];
      if (activityScore > 70) reasons.push('Proven track record with similar events');
      else if (activityScore > 55) reasons.push('Has hosted similar events before');
      if (capBonus === 100) reasons.push(`Enough rooms for ${group.number || 0} guests`);

      // ── Detailed score log per hotel × group ──
      console.log(`   🏨 ${hotel.name.padEnd(30)} | Gemini: ${String(Math.round(geminiGroupScore)).padStart(3)}×0.50  Activity: ${String(Math.round(activityScore)).padStart(3)}×0.35  Capacity: ${String(Math.round(capBonus)).padStart(3)}×0.10  City: ${String(Math.round(cityBonus)).padStart(3)}×0.05  → TOTAL: ${Math.round(finalScore)}`);
      if (gScore.reasons?.length) console.log(`      Gemini reasons: ${gScore.reasons.slice(0, 2).join(' | ')}`);
      if (!geminiScores?.groupScores?.[groupId]?.[hotelId]) console.log(`      ⚠️  No Gemini group score — rule-based applied (type inferred from group name)`);
      if (!activityVectors[hotelId]) console.log('      ⚠️  No activity vector — hotel has no event history yet');


      groupScores.push({
        hotelId: hotel._id,
        hotelName: hotel.name,
        groupScore: Math.round(finalScore),
        breakdown: {
          geminiGroupScore: Math.round(geminiGroupScore),
          activityScore: Math.round(activityScore),
          capacityBonus: Math.round(capBonus),
          cityBonus: Math.round(cityBonus),
        },
        reasons,
        hotel,
      });
    }

    groupScores.sort((a, b) => b.groupScore - a.groupScore);
    groupRecommendations.push({
      groupId: group._id,
      groupName: group.name,
      groupType: group.relationshipType || group.type || 'general',
      eventType: event.isPrivate ? 'private' : 'public',
      hotels: groupScores.slice(0, 3),
    });

    // ── Group result summary ──
    console.log(`   ┌─ RANKING for "${group.name}":`);
    groupScores.forEach((s, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`   │ ${medal} #${i + 1} ${s.hotelName} — ${s.groupScore}/100  [Gemini:${s.breakdown.geminiGroupScore} Act:${s.breakdown.activityScore} Cap:${s.breakdown.capacityBonus} City:${s.breakdown.cityBonus}]`);
      if (s.reasons?.length) console.log(`   │    → ${s.reasons.slice(0, 2).join(' | ')}`);
    });
    console.log('   └' + '─'.repeat(66));
  }

  return groupRecommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual guest scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score hotels for an individual guest.
 * Blends event-level Gemini score + activity history + personal amenity signals.
 *
 * @param {Array<Object>} hotels
 * @param {Object}        event
 * @param {string}        guestEmail
 * @param {Object}        geminiScores
 * @param {Object}        activityVectors  — pre-fetched { hotelId: vector }
 * @param {number[]}      eventVector
 * @param {Array<Object>} bookingHistory   — guest's past bookings
 * @returns {Array<{ hotelId, hotelName, personalScore, reasons, hotel }>}
 */
export function scoreHotelsForGuest(hotels, event, guestEmail, geminiScores, activityVectors, eventVector, bookingHistory = []) {
  const guestScores = [];

  for (const hotel of hotels) {
    const hotelId = hotel._id?.toString();

    // 1. Event-level Gemini score as base (40%)
    const geminiEventScore = geminiScores?.eventScores?.[hotelId]?.score || 50;

    // 2. Activity history score (30%)
    let activityScore = 50;
    if (eventVector && activityVectors[hotelId]) {
      try { activityScore = cosineSimilarity(eventVector, activityVectors[hotelId]) * 100; } catch { /* skip */ }
    }

    // 3. Personal booking history (20% max)
    const previousStays = bookingHistory.filter(
      b => b.inventory?.hotelName?.toLowerCase() === hotel.name?.toLowerCase()
    ).length;
    const historyBonus = Math.min(previousStays * 10, 20);

    // 4. Amenity match (10% max)
    const facilities = getMergedFacilities(hotel);
    const preferredAmenities = ['wifi', 'pool', 'gym', 'spa', 'restaurant', 'bar'];
    const amenityMatches = facilities.filter(f => preferredAmenities.some(p => f.includes(p))).length;
    const amenityBonus = Math.min(amenityMatches * 2, 10);

    const personalScore =
      (0.40 * geminiEventScore) +
      (0.30 * activityScore) +
      historyBonus +
      amenityBonus;

    const reasons = [...(geminiScores?.eventScores?.[hotelId]?.reasons?.slice(0, 2) || [])];
    if (previousStays > 0) reasons.push(`You've stayed here ${previousStays} time(s) before`);
    if (amenityMatches > 2) reasons.push(`${amenityMatches} preferred amenities available`);

    guestScores.push({
      hotelId: hotel._id,
      hotelName: hotel.name,
      personalScore: Math.min(Math.round(personalScore), 100),
      reasons,
      reasonCategory: 'personal-preference',
      hotel,
    });
  }

  return guestScores.sort((a, b) => b.personalScore - a.personalScore).slice(0, 3);
}
