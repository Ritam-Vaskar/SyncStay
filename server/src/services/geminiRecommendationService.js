/**
 * Gemini Recommendation Service
 *
 * Uses Google Gemini Flash (free tier) to score hotels against groups based on
 * real TBO HotelFacilities + Description + HotelRating.
 *
 * Gemini understands natural language: "Conference center, Meeting rooms, Business WiFi"
 * → strong match for a corporate group. "Pool, Bar, Rooftop Lounge" → strong match for friends.
 *
 * Falls back to rule-based scoring if the API call fails.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getMergedFacilities } from './tboHotelEnrichmentService.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Rule-based fallback: score a hotel for a group based on facilities and group type.
 * Used when Gemini API is unavailable.
 */
function ruleBasedGroupScore(hotel, group) {
  // Determine effective relationship type from explicit type OR inferred from group name
  let rel = (group.relationshipType || group.type || 'general').toLowerCase();

  // When type is 'manual' or 'general', infer relationship from the group name
  if (rel === 'manual' || rel === 'general' || rel === 'other') {
    const nameLower = (group.name || '').toLowerCase();
    if (nameLower.includes('vip') || nameLower.includes('executive') || nameLower.includes('premium')) {
      rel = 'vip';
    } else if (nameLower.includes('colleague') || nameLower.includes('collegue') || nameLower.includes('staff') || nameLower.includes('team') || nameLower.includes('employee') || nameLower.includes('corporate') || nameLower.includes('coworker') || nameLower.includes('co-worker')) {
      rel = 'corporate';
    } else if (nameLower.includes('family') || nameLower.includes('families') || nameLower.includes('spouse') || nameLower.includes('child')) {
      rel = 'family';
    } else if (nameLower.includes('friend') || nameLower.includes('social') || nameLower.includes('leisure')) {
      rel = 'friend';
    } else if (nameLower.includes('speaker') || nameLower.includes('presenter') || nameLower.includes('keynote')) {
      rel = 'speaker';
    } else if (nameLower.includes('vendor') || nameLower.includes('supplier') || nameLower.includes('partner')) {
      rel = 'vendor';
    }
  }

  const facilities = getMergedFacilities(hotel);
  const rating = hotel._tboEnriched ? (hotel.tboRating || hotel.averageRating || 0) : (hotel.averageRating || 0);
  const priceAvg = hotel.priceRange?.min
    ? (hotel.priceRange.min + (hotel.priceRange.max || hotel.priceRange.min)) / 2 : 0;
  const has = (...kws) => facilities.some(f => kws.some(k => f.includes(k)));
  const groupSize = group.number || group.members?.length || 0;

  let score = 50; // neutral baseline
  const reasons = [];

  if (rel === 'vip') {
    if (rating >= 4.5) { score += 22; reasons.push('Top-rated luxury property for VIP guests'); }
    else if (rating >= 4.0) { score += 14; reasons.push('Highly rated for VIPs'); }
    else if (rating >= 3.5) { score += 6; reasons.push('Decent rating for VIP group'); }
    if (priceAvg > 8000) { score += 10; reasons.push('Premium tier pricing suits VIP expectations'); }
    if (has('concierge', 'butler', 'executive', 'suite', 'spa')) { score += 10; reasons.push('Premium concierge & luxury facilities'); }
    // Small VIP groups prefer boutique luxury
    if (groupSize > 0 && groupSize <= 20) { score += 5; reasons.push('Boutique scale ideal for exclusive VIP group'); }
  } else if (rel === 'corporate' || rel === 'colleague') {
    if (has('conference', 'conference center', 'meeting', 'boardroom', 'business center', 'business centre')) { score += 22; reasons.push('Conference & business center available'); }
    if (has('wifi', 'free wifi')) { score += 8; reasons.push('High-speed WiFi for corporate needs'); }
    if (has('projector', 'av', 'audio visual')) { score += 5; reasons.push('AV equipment on-site'); }
    // Large corporate groups need high capacity
    if (groupSize >= 100 && hotel.totalRooms >= Math.ceil(groupSize / 2)) {
      score += 8; reasons.push(`Large capacity hotel confirmed for ${groupSize} colleagues`);
    }
  } else if (rel === 'family') {
    if (has('pool', 'swimming pool', 'kids', 'children', 'playground')) { score += 18; reasons.push('Family-friendly pool & kid amenities'); }
    if (has('restaurant', 'dining')) { score += 8; reasons.push('In-house dining for families'); }
    if (priceAvg < 6000 && priceAvg > 0) { score += 7; reasons.push('Family-budget friendly pricing'); }
  } else if (rel === 'friend') {
    if (has('bar', 'pool', 'rooftop', 'lounge', 'entertainment', 'nightclub')) { score += 20; reasons.push('Leisure & entertainment facilities'); }
    if (has('gym', 'fitness', 'spa')) { score += 8; reasons.push('Recreation facilities'); }
  } else if (rel === 'speaker') {
    if (has('wifi', 'business center', 'workspace', 'desk')) { score += 15; reasons.push('Work-friendly environment for speakers'); }
    if (rating >= 4.0) { score += 12; reasons.push('High quality property for speakers'); }
  } else if (rel === 'vendor') {
    if (priceAvg < 4000 && priceAvg > 0) { score += 20; reasons.push('Budget-friendly for vendors'); }
    if (has('parking', 'free parking')) { score += 10; reasons.push('Parking for vendor logistics'); }
  } else {
    if (rating >= 4.0) { score += 10; reasons.push('Well-rated property'); }
    if (has('wifi', 'restaurant', 'gym')) { score += 8; reasons.push('Core amenities available'); }
  }

  // ── Group-size capacity scoring (differentiates hotels for different sized groups) ──
  if (groupSize > 0) {
    const roomsNeeded = Math.ceil(groupSize / 2);
    if (hotel.totalRooms > 0) {
      if (groupSize <= 20) {
        // Small groups: capacity easily met — reward high rating instead
        if (rating >= 4.5) { score += 8; reasons.push('Premium quality rating for small exclusive group'); }
        else if (rating >= 4.0) { score += 4; reasons.push('Good quality property for small group'); }
      } else if (groupSize >= 50) {
        // Large groups: capacity matters heavily
        if (hotel.totalRooms >= roomsNeeded) {
          score += 10; reasons.push(`${hotel.totalRooms} rooms — sufficient for ${groupSize} guests`);
        } else if (hotel.totalRooms >= roomsNeeded * 0.7) {
          score += 3; reasons.push('Partially sufficient capacity');
        } else {
          score -= 15; reasons.push('Insufficient room capacity for group size');
        }
      }
    } else {
      // No room data — small groups get slight bonus for unknown boutique, large groups get penalty
      if (groupSize <= 20) { score += 3; }
      else if (groupSize >= 100) { score -= 5; reasons.push('Room count unknown — risk for large group'); }
    }
  }

  return { score: Math.min(Math.max(score, 0), 100), reasons };
}

/**
 * Rule-based fallback for event-level (planner) facility score.
 */
function ruleBasedEventScore(hotel, event) {
  const facilities = getMergedFacilities(hotel);
  const rating = hotel._tboEnriched ? (hotel.tboRating || hotel.averageRating || 0) : (hotel.averageRating || 0);
  const has = (...kws) => facilities.some(f => kws.some(k => f.includes(k)));
  const eventType = (event.type || '').toLowerCase();

  let score = 50;
  const reasons = [];

  if (['conference', 'corporate', 'summit', 'seminar', 'workshop'].some(t => eventType.includes(t))) {
    if (has('conference', 'conference center', 'meeting', 'boardroom')) { score += 20; reasons.push('Conference facilities match event type'); }
    if (has('wifi', 'free wifi')) { score += 8; reasons.push('WiFi infrastructure for tech events'); }
  } else if (['wedding', 'gala', 'celebration', 'social'].some(t => eventType.includes(t))) {
    if (has('banquet', 'ballroom', 'wedding', 'event hall')) { score += 20; reasons.push('Banquet/event hall for weddings'); }
    if (has('catering', 'restaurant', 'bar')) { score += 8; reasons.push('Catering & bar services'); }
  } else if (['concert', 'festival', 'entertainment'].some(t => eventType.includes(t))) {
    if (has('auditorium', 'stage', 'entertainment', 'large hall')) { score += 20; reasons.push('Entertainment venue capabilities'); }
  }

  if (rating >= 4.5) { score += 12; reasons.push('Top-tier hotel rating'); }
  else if (rating >= 4.0) { score += 7; reasons.push('High hotel rating'); }

  return { score: Math.min(score, 100), reasons };
}

/**
 * Score hotels using Gemini AI for both event-level and group-level fit.
 * Makes a single Gemini call per invocation (batch all groups + hotels together).
 *
 * @param {Array<Object>} hotels       — TBO-enriched hotel objects
 * @param {Object}        event        — Event document
 * @param {Array<Object>} groups       — InventoryGroup documents (empty [] for planner search)
 * @returns {Promise<{
 *   eventScores: Object,           // { hotelId: { score, reasons, facilityHighlights } }
 *   groupScores: Object,           // { groupId: { hotelId: { score, reasons } } }
 * }>}
 */
export async function scoreFacilitiesWithGemini(hotels, event, groups = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set — using rule-based fallback');
    return buildFallbackScores(hotels, event, groups);
  }

  // Build compact hotel summaries for the prompt (avoid token bloat)
  const hotelSummaries = hotels.map(h => ({
    id: h._id?.toString(),
    name: h.name || h.organization,
    rating: h._tboEnriched ? (h.tboRating || h.averageRating || 0) : (h.averageRating || 0),
    facilities: getMergedFacilities(h).slice(0, 40), // cap at 40 facilities
    description: (h._tboEnriched ? h.tboDescription : h.description || '').slice(0, 400),
    priceRange: h.priceRange || {},
    totalRooms: h.totalRooms || 0,
    specialization: h.specialization || [],
  }));

  const groupSummaries = groups.map(g => ({
    id: g._id?.toString(),
    name: g.name,
    type: g.relationshipType || g.type || 'general',
    size: g.number || g.members?.length || 0,
    description: g.description || '',
  }));

  const prompt = `You are a hotel recommendation engine for event planning.

EVENT:
- Name: ${event.name}
- Type: ${event.type || 'general'}
- Scale: ${event.expectedGuests || 0} total guests
- Location: ${event.location?.city || ''}, ${event.location?.country || ''}
- Description: ${(event.description || '').slice(0, 300)}

HOTELS (${hotelSummaries.length}):
${JSON.stringify(hotelSummaries, null, 2)}

${groups.length > 0 ? `GUEST GROUPS (${groups.length}):
${JSON.stringify(groupSummaries, null, 2)}` : ''}

TASK:
1. For each hotel, score it 0-100 for how well it fits this EVENT overall.
2. ${groups.length > 0 ? 'For each hotel × group combination, score 0-100 for how well the hotel fits that SPECIFIC GROUP (different groups should get different scores based on their type and needs).' : 'No groups provided — only event scores needed.'}

SCORING RULES:
- VIP/executive groups need luxury, concierge, high rating (4.5+), premium price
- Corporate/colleague groups need conference rooms, meeting facilities, business center, wifi
- Family groups need pool, kids amenities, restaurant, affordable price
- Friend groups need bar, pool, leisure amenities, entertainment
- Speaker groups need wifi, workspace, quiet environment, high quality
- Vendor groups need parking, affordable price, practical amenities
- Always check actual facility list — do not assume facilities that are not listed
- Give specific reason strings mentioning actual facility names from the hotel

OUTPUT: Respond ONLY with valid JSON in this exact format:
{
  "eventScores": [
    {
      "hotelId": "<id>",
      "score": <0-100>,
      "facilityHighlights": ["<actual facility name>", ...],
      "reasons": ["<specific reason mentioning actual facilities>", ...]
    }
  ],
  "groupScores": [
    {
      "groupId": "<id>",
      "hotels": [
        {
          "hotelId": "<id>",
          "score": <0-100>,
          "reasons": ["<specific reason>", ...]
        }
      ]
    }
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response (sometimes wrapped in ```json blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalise into lookup maps
    const eventScores = {};
    for (const item of (parsed.eventScores || [])) {
      eventScores[item.hotelId] = {
        score: Math.min(Math.max(item.score || 50, 0), 100),
        reasons: item.reasons || [],
        facilityHighlights: item.facilityHighlights || [],
      };
    }

    const groupScores = {};
    for (const gResult of (parsed.groupScores || [])) {
      groupScores[gResult.groupId] = {};
      for (const hResult of (gResult.hotels || [])) {
        groupScores[gResult.groupId][hResult.hotelId] = {
          score: Math.min(Math.max(hResult.score || 50, 0), 100),
          reasons: hResult.reasons || [],
        };
      }
    }

    console.log(`✅ Gemini scored ${Object.keys(eventScores).length} hotels × ${Object.keys(groupScores).length} groups`);
    return { eventScores, groupScores };
  } catch (err) {
    console.warn('⚠️  Gemini API error, falling back to rule-based:', err.message);
    return buildFallbackScores(hotels, event, groups);
  }
}

/**
 * Build rule-based fallback scores in the same shape as Gemini output.
 */
export function buildFallbackScores(hotels, event, groups) {
  const eventScores = {};
  const groupScores = {};

  for (const hotel of hotels) {
    const hotelId = hotel._id?.toString();
    const evResult = ruleBasedEventScore(hotel, event);
    eventScores[hotelId] = { score: evResult.score, reasons: evResult.reasons, facilityHighlights: [] };

    for (const group of groups) {
      const groupId = group._id?.toString();
      if (!groupScores[groupId]) groupScores[groupId] = {};
      const grResult = ruleBasedGroupScore(hotel, group);
      groupScores[groupId][hotelId] = { score: grResult.score, reasons: grResult.reasons };
    }
  }

  return { eventScores, groupScores };
}
