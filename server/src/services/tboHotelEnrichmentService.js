/**
 * TBO Hotel Enrichment Service
 *
 * Fetches real hotel details (facilities, description, rating, images) from the
 * TBO HotelDetails API and merges them onto local hotel User documents/plain objects.
 *
 * Only enriches hotels with hotelSource === 'tbo' and tboData.hotelCode set.
 * Hotels without a TBO code pass through unchanged.
 */
import tboService from './tboService.js';

/**
 * Given an array of hotel User documents (or lean objects), fetch TBO details
 * for those that have a TBO code and return enriched plain objects.
 *
 * Enriched fields added:
 *   tboFacilities   string[]  — lowercased HotelFacilities from TBO
 *   tboDescription  string    — full TBO description
 *   tboRating       number    — HotelRating (1–5)
 *   tboImages       string[]  — TBO image URLs
 *   tboAttractions  string[]  — nearby attractions
 *   tboAddress      string    — full address string
 *   _tboEnriched    true      — flag for downstream consumers
 *
 * @param {Array<Object>} hotels
 * @returns {Promise<Array<Object>>}
 */
export async function enrichHotelsWithTBO(hotels) {
  if (!hotels || hotels.length === 0) return hotels;

  const tboHotels = [];
  const nonTboMap = {};

  for (const hotel of hotels) {
    const code = hotel.tboData?.hotelCode;
    if (hotel.hotelSource === 'tbo' && code) {
      tboHotels.push({ hotel, code: String(code) });
    } else {
      nonTboMap[hotel._id?.toString()] = hotel;
    }
  }

  if (tboHotels.length === 0) {
    console.log('ℹ️  No TBO hotels in set — skipping TBO enrichment');
    return hotels;
  }

  // Fetch TBO details (with 24-hour in-memory cache inside tboService)
  const codes = tboHotels.map(h => h.code);
  const tboDetailsList = await tboService.getHotelDetailsCached(codes);

  // Build lookup: tboCode → detail object
  const tboDetailsMap = {};
  for (const detail of tboDetailsList) {
    if (detail?.HotelCode) tboDetailsMap[String(detail.HotelCode)] = detail;
  }

  // Enrich each TBO hotel
  const enrichedById = {};
  for (const { hotel, code } of tboHotels) {
    const detail = tboDetailsMap[code];
    if (!detail) {
      enrichedById[hotel._id?.toString()] = hotel; // no TBO data — keep as-is
      continue;
    }

    // Convert TBO attraction object { "1) ": "name" } → string[]
    const attractions = detail.Attractions
      ? Object.values(detail.Attractions).map(v => v?.trim()).filter(Boolean)
      : [];

    const tboImages = detail.Images?.length
      ? detail.Images
      : detail.Image ? [detail.Image] : [];

    enrichedById[hotel._id?.toString()] = {
      ...hotel,
      tboFacilities: (detail.HotelFacilities || []).map(f => f.toLowerCase()),
      tboDescription: detail.Description || hotel.description || '',
      tboRating: detail.HotelRating || hotel.averageRating || 0,
      tboImages,
      tboAddress: detail.Address || '',
      tboAttractions: attractions,
      tboCheckIn: detail.CheckInTime || '',
      tboCheckOut: detail.CheckOutTime || '',
      _tboEnriched: true,
    };
  }

  // Reconstruct in original order
  return hotels.map(h => enrichedById[h._id?.toString()] || nonTboMap[h._id?.toString()] || h);
}

/**
 * Returns the merged, deduplicated facilities array for a hotel.
 * Prefers TBO real facilities over local schema data.
 *
 * @param {Object} hotel — possibly TBO-enriched hotel object
 * @returns {string[]} lowercased, deduplicated facility strings
 */
export function getMergedFacilities(hotel) {
  const local = (hotel.facilities || []).map(f => f.toLowerCase());
  const tbo = hotel.tboFacilities || [];
  return [...new Set([...tbo, ...local])]; // TBO first so dedup keeps TBO version
}
