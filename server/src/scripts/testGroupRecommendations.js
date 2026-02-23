/**
 * Test script: Run the full group recommendation pipeline for a real event
 * and print a detailed diagnosis of why each hotel gets its score.
 *
 * Usage:
 *   node src/scripts/testGroupRecommendations.js [eventId]
 *
 * If no eventId is given, it picks the first event that has selectedHotels.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

import connectDB from '../config/database.js';
import { initializeCollections, retrieveVector, COLLECTIONS } from '../config/qdrant.js';

// ── register all mongoose models ─────────────────────────────────────────────
import '../models/User.js';
import Event from '../models/Event.js';
import InventoryGroup from '../models/InventoryGroup.js';
import '../models/Booking.js';
import '../models/HotelActivity.js';
// ─────────────────────────────────────────────────────────────────────────────

import { enrichHotelsWithTBO, getMergedFacilities } from '../services/tboHotelEnrichmentService.js';
import { scoreFacilitiesWithGemini, buildFallbackScores } from '../services/geminiRecommendationService.js';

const SEP = '═'.repeat(72);
const sep = '─'.repeat(72);

async function diagnose(eventId) {
  await connectDB();
  await initializeCollections();

  // ── 1. Fetch event + hotels + groups ──────────────────────────────────────
  const event = await Event.findById(eventId).populate('selectedHotels.hotel');
  if (!event) throw new Error(`Event ${eventId} not found`);

  const groups = await InventoryGroup.find({ event: eventId });
  const hotels = event.selectedHotels.map(sh => sh.hotel).filter(Boolean);

  console.log('\n' + SEP);
  console.log(`EVENT : ${event.name}`);
  console.log(`TYPE  : ${event.type || '(none)'}  |  Guests: ${event.expectedGuests || '?'}  |  City: ${event.location?.city || '?'}`);
  console.log(`HOTELS: ${hotels.length}  |  GROUPS: ${groups.length}`);
  console.log(SEP);

  if (!hotels.length) { console.log('❌ No selected hotels on this event. Select some hotels first.'); process.exit(0); }
  if (!groups.length)  { console.log('❌ No InventoryGroups found for this event.'); process.exit(0); }

  // ── 2. Print raw hotel data ────────────────────────────────────────────────
  console.log('\n📋 RAW HOTEL DATA (before TBO enrichment):');
  for (const h of hotels) {
    console.log(`  🏨 ${h.name}`);
    console.log(`     DB facilities (${(h.facilities||[]).length}): ${(h.facilities||[]).slice(0,8).join(', ') || 'NONE'}`);
    console.log(`     hotelSource: ${h.hotelSource || 'local'}  |  tboData.hotelCode: ${h.tboData?.hotelCode || 'NONE'}`);
    console.log(`     averageRating: ${h.averageRating || 0}  |  totalRooms: ${h.totalRooms || 0}  |  city: ${h.location?.city || '?'}`);
  }

  // ── 3. Print raw group data ───────────────────────────────────────────────
  console.log('\n👥 RAW GROUP DATA:');
  for (const g of groups) {
    console.log(`  📌 ${g.name}  type=${g.relationshipType || g.type || '(none)'}  size=${g.number || g.members?.length || '?'}`);
  }

  // ── 4. TBO enrichment ─────────────────────────────────────────────────────
  console.log('\n' + sep);
  console.log('STEP 1 — TBO enrichment');
  console.log(sep);
  const enriched = await enrichHotelsWithTBO(hotels);
  for (const h of enriched) {
    const f = getMergedFacilities(h);
    console.log(`  🏨 ${h.name}`);
    console.log(`     _tboEnriched: ${h._tboEnriched}  |  tboRating: ${h.tboRating || 'N/A'}  |  facilities after merge: ${f.length}`);
    console.log(`     Facilities (first 12): ${f.slice(0, 12).join(', ') || 'NONE'}`);
    if (h.tboDescription) console.log(`     TBO description snippet: ${h.tboDescription.slice(0, 120)}...`);
  }

  // ── 5. Gemini scoring ─────────────────────────────────────────────────────
  console.log('\n' + sep);
  console.log('STEP 2 — Gemini / fallback scoring');
  console.log(sep);
  let geminiScores;
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`  GEMINI_API_KEY present: ${!!apiKey}`);
  try {
    geminiScores = await scoreFacilitiesWithGemini(enriched, event, groups);
    console.log(`  ✅ Gemini returned scores for ${Object.keys(geminiScores.eventScores || {}).length} hotels, ${Object.keys(geminiScores.groupScores || {}).length} groups`);
  } catch (err) {
    console.log(`  ❌ Gemini call failed: ${err.message} — using fallback`);
    geminiScores = buildFallbackScores(enriched, event, groups);
  }

  // Print raw Gemini scores
  console.log('\n  EVENT-LEVEL Gemini scores:');
  for (const h of enriched) {
    const id = h._id.toString();
    const s = geminiScores.eventScores?.[id];
    console.log(`    ${h.name}: score=${s?.score ?? 'MISSING'}  reasons=${(s?.reasons||[]).slice(0,2).join(' | ') || 'none'}`);
  }
  console.log('\n  GROUP-LEVEL Gemini scores:');
  for (const g of groups) {
    const gid = g._id.toString();
    const gMap = geminiScores.groupScores?.[gid];
    console.log(`  Group "${g.name}" (${g.relationshipType || g.type || 'general'}):`);
    if (!gMap || !Object.keys(gMap).length) {
      console.log('    ⚠️  NO GROUP SCORES from Gemini — all hotels will get neutral 50');
    } else {
      for (const h of enriched) {
        const hs = gMap[h._id.toString()];
        console.log(`    ${h.name}: score=${hs?.score ?? 'MISSING(→50)'}  reasons=${(hs?.reasons||[]).slice(0,2).join(' | ') || 'none'}`);
      }
    }
  }

  // ── 6. Activity vectors ───────────────────────────────────────────────────
  console.log('\n' + sep);
  console.log('STEP 3 — Qdrant activity vectors');
  console.log(sep);

  const eventVectorData = await retrieveVector(COLLECTIONS.EVENTS, eventId.toString());
  console.log(`  Event vector in Qdrant: ${eventVectorData?.vector ? 'YES (dim=' + eventVectorData.vector.length + ')' : 'NO — activity scoring will use neutral 50'}`);

  for (const h of enriched) {
    const av = await retrieveVector(COLLECTIONS.HOTEL_ACTIVITY, h._id.toString());
    console.log(`  🏨 ${h.name}: activity vector=${av?.vector ? 'YES (dim=' + av.vector.length + ')' : 'NO'}`);
  }

  // ── 7. Final hybrid scoring ───────────────────────────────────────────────
  console.log('\n' + sep);
  console.log('STEP 4 — Final hybrid score per group (weights: 50% Gemini + 35% Activity + 10% Capacity + 5% City)');
  console.log(sep);

  const eventVector = eventVectorData?.vector || null;

  // inline lightweight version so we see everything
  for (const group of groups) {
    const gid = group._id.toString();
    console.log(`\n  ── GROUP: "${group.name}" | type=${group.relationshipType || group.type || 'general'} | size=${group.number || '?'}`);
    const scores = [];

    for (const h of enriched) {
      const hid = h._id.toString();
      const geminiGroupScore = geminiScores.groupScores?.[gid]?.[hid]?.score ?? 50;
      const geminiReasons     = geminiScores.groupScores?.[gid]?.[hid]?.reasons || [];

      // capacity
      const guestCount = group.number || group.members?.length || 0;
      const roomsNeeded = Math.ceil(guestCount / 2);
      let capBonus = 50;
      if (h.totalRooms && guestCount > 0) {
        capBonus = h.totalRooms >= roomsNeeded ? 100 : h.totalRooms >= roomsNeeded * 0.7 ? 70 : 30;
      }

      // city
      const hCity = (h.location?.city || '').toLowerCase();
      const eCity = (event.location?.city || '').toLowerCase();
      let cityBonus = 50;
      if (hCity && eCity) {
        cityBonus = hCity === eCity ? 100 : (hCity.includes(eCity) || eCity.includes(hCity)) ? 80 : 30;
      }

      // activity (cosine not run here — just shows if vector exists)
      const av = await retrieveVector(COLLECTIONS.HOTEL_ACTIVITY, hid);
      const activityNote = av?.vector ? `vector exists (used in runtime)` : `NO VECTOR → score=50 (neutral)`;

      const activityScoreNote = av?.vector && eventVector ? 'cosine(eventVec, actVec)×100' : '50 (neutral)';
      const activityScoreApprox = 50; // approximation here; actual computed at runtime

      const finalApprox = Math.round(
        0.50 * geminiGroupScore +
        0.35 * activityScoreApprox +
        0.10 * capBonus +
        0.05 * cityBonus
      );

      scores.push({ name: h.name, geminiGroupScore, activityScoreApprox, capBonus, cityBonus, finalApprox, geminiReasons, activityNote });

      console.log(`     🏨 ${h.name.padEnd(32)}`);
      console.log(`        Gemini group score : ${geminiGroupScore} (${geminiGroupScore === 50 && !geminiScores.groupScores?.[gid]?.[hid] ? '⚠️  MISSING — defaulted to 50' : 'from Gemini/fallback'})`);
      if (geminiReasons.length) console.log(`        Gemini reasons    : ${geminiReasons.slice(0,2).join(' | ')}`);
      console.log(`        Activity vector   : ${activityNote}`);
      console.log(`        Activity score    : ${activityScoreNote}`);
      console.log(`        Capacity bonus    : ${capBonus} (rooms=${h.totalRooms || '?'}, need=${roomsNeeded})`);
      console.log(`        City bonus        : ${cityBonus} (hotel=${h.location?.city || '?'}, event=${event.location?.city || '?'})`);
      console.log(`        ➤ APPROX TOTAL   : ${finalApprox}/100  (activity=50 used as approx; actual may differ)`);
    }

    scores.sort((a, b) => b.finalApprox - a.finalApprox);
    console.log(`\n     📊 Ranking for "${group.name}": ${scores.map((s, i) => `#${i+1} ${s.name}(${s.finalApprox})`).join('  >  ')}`);
    
    // Diagnosis
    const uniqueScores = new Set(scores.map(s => s.finalApprox));
    if (uniqueScores.size === 1) {
      console.log(`     ❌ SAME SCORE DETECTED! All hotels scored ${[...uniqueScores][0]}.`);
      const allMissingGemini = scores.every(s => s.geminiGroupScore === 50 && !geminiScores.groupScores?.[gid]?.[s.name]);
      if (allMissingGemini) console.log('        ROOT CAUSE: Gemini group scores are all missing/neutral (50).');
      const allMissingActivity = scores.every(s => s.activityNote.includes('NO VECTOR'));
      if (allMissingActivity) console.log('        ROOT CAUSE: No activity vectors in Qdrant for any hotel.');
      const allSameCapacity = new Set(scores.map(s => s.capBonus)).size === 1;
      if (allSameCapacity) console.log('        ROOT CAUSE: All hotels have same capacity bonus (possibly totalRooms=0 for all).');
      const allSameCity = new Set(scores.map(s => s.cityBonus)).size === 1;
      if (allSameCity) console.log('        ROOT CAUSE: All hotels in same city → same city bonus.');
    } else {
      console.log(`     ✅ Scores are differentiated across hotels.`);
    }
  }

  console.log('\n' + SEP);
  console.log('DIAGNOSIS COMPLETE');
  console.log(SEP + '\n');
  process.exit(0);
}

async function main() {
  let eventId = process.argv[2];

  if (!eventId) {
    // auto-pick first event with selectedHotels
    await connectDB();
    const ev = await Event.findOne({ 'selectedHotels.0': { $exists: true } }).select('_id name');
    if (!ev) { console.log('No events with selected hotels found.'); process.exit(0); }
    console.log(`No eventId given — using: ${ev._id} (${ev.name})`);
    eventId = ev._id.toString();
  }

  await diagnose(eventId);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
