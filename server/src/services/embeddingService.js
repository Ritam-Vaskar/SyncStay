import OpenAI from 'openai';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// In-memory cache for embeddings (optional, can use Redis)
const embeddingCache = new Map();

/**
 * Generate embedding for text
 * @param {string} text - Text to embed
 * @param {boolean} useCache - Whether to use cache
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function generateEmbedding(text, useCache = true) {
  try {
    // Generate hash for caching
    const textHash = crypto.createHash('md5').update(text).digest('hex');

    // Check cache
    if (useCache && embeddingCache.has(textHash)) {
      console.log('📦 Using cached embedding');
      return embeddingCache.get(textHash);
    }

    // Call OpenAI API
    console.log('🤖 Generating new embedding...');
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0].embedding;

    // Cache the result
    if (useCache) {
      embeddingCache.set(textHash, embedding);
      
      // Limit cache size to 1000 items
      if (embeddingCache.size > 1000) {
        const firstKey = embeddingCache.keys().next().value;
        embeddingCache.delete(firstKey);
      }
    }

    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for an event
 * @param {Object} event - Event object
 * @returns {Promise<Object>} - { vector, hash }
 */
export async function generateEventEmbedding(event) {
  const budget = event.budget || event.budgetRange?.min || 0;
  const eventText = `
Title: ${event.name}
Type: ${event.type || 'general'}
Description: ${event.description || 'No description'}
Location: ${event.location?.city || ''}, ${event.location?.country || ''}
Budget: ${budget} INR
Attendees: ${event.expectedGuests || 0}
Event Category: ${event.category || event.type || 'general'}
Duration: ${event.startDate ? new Date(event.startDate).toDateString() : ''} to ${event.endDate ? new Date(event.endDate).toDateString() : ''}
`.trim();

  const vector = await generateEmbedding(eventText);
  const hash = crypto.createHash('md5').update(eventText).digest('hex');

  return { vector, hash, text: eventText };
}

/**
 * Generate embedding for a hotel
 * @param {Object} hotel - Hotel/User object with hotel role
 * @returns {Promise<Object>} - { vector, hash }
 */
export async function generateHotelEmbedding(hotel) {
  // Prefer TBO-enriched data (set by tboHotelEnrichmentService) over local schema fields
  const facilities = hotel._tboEnriched
    ? [...new Set([...(hotel.tboFacilities || []), ...(hotel.facilities || []).map(f => f.toLowerCase())])]
    : (hotel.facilities || []);

  const description = hotel._tboEnriched
    ? (hotel.tboDescription || hotel.description || 'Professional hotel services for events')
    : (hotel.description || 'Professional hotel services for events and gatherings');

  const rating = hotel._tboEnriched ? (hotel.tboRating || hotel.averageRating || 0) : (hotel.averageRating || 0);

  const hotelText = `
Hotel Name: ${hotel.name || hotel.organization}
Location: ${hotel.location?.city || ''}, ${hotel.location?.country || ''}
Star Rating: ${rating} out of 5
Capacity: ${hotel.totalRooms || 0} rooms, can host ${(hotel.totalRooms || 0) * 2} guests
Event Specialization: ${hotel.specialization?.join(', ') || 'All types of events'}
Price Range: ${hotel.priceRange?.min || 0} to ${hotel.priceRange?.max || 0} INR per room per night
Facilities & Amenities: ${facilities.length ? facilities.join(', ') : 'Standard hotel amenities'}
Description: ${description}
`.trim();

  const vector = await generateEmbedding(hotelText);
  const hash = crypto.createHash('md5').update(hotelText).digest('hex');

  return { vector, hash, text: hotelText };
}

/**
 * Generate a cumulative activity embedding for a hotel.
 * Aggregates ALL past HotelActivity documents into a single descriptive text
 * so Qdrant can semantically match: event type → which hotels hosted similar events.
 *
 * @param {string|ObjectId} hotelId
 * @returns {Promise<{ vector: number[], hash: string, text: string, activityCount: number }>}
 */
export async function generateHotelActivityEmbedding(hotelId) {
  // Dynamic import to avoid circular deps (HotelActivity → embeddingService)
  const { default: HotelActivity } = await import('../models/HotelActivity.js');
  const { default: User } = await import('../models/User.js');

  const hotel = await User.findById(hotelId).select('name location specialization').lean();
  const activities = await HotelActivity.find({ hotel: hotelId })
    .sort({ eventDate: -1 })
    .limit(30) // use most recent 30 events for embedding
    .lean();

  if (activities.length === 0) {
    // No activity yet — embed just the hotel profile so the collection stays populated
    const profileText = `Hotel: ${hotel?.name || 'Unknown Hotel'} | No event history yet`;
    const vector = await generateEmbedding(profileText);
    const hash = crypto.createHash('md5').update(profileText).digest('hex');
    return { vector, hash, text: profileText, activityCount: 0 };
  }

  // Count by event type for dominant specialization
  const typeCounts = {};
  for (const a of activities) {
    typeCounts[a.eventType] = (typeCounts[a.eventType] || 0) + 1;
  }
  const dominantTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type} (${count}x)`)
    .join(', ');

  const totalGuests = activities.reduce((s, a) => s + (a.eventScale || 0), 0);
  const avgScale = activities.length > 0 ? Math.round(totalGuests / activities.length) : 0;

  const historyLines = activities
    .slice(0, 15)
    .map((a, i) => `${i + 1}. ${a.eventName || 'Event'} — Type: ${a.eventType || 'general'} — ${a.eventScale || 0} guests — ${a.eventLocation?.city || ''} — ${a.outcome}`)
    .join('\n');

  const activityText = `
Hotel: ${hotel?.name || 'Unknown'} in ${hotel?.location?.city || ''}
Event History (most recent first):
${historyLines}
Event Type Expertise: ${dominantTypes}
Total Events Hosted: ${activities.length}
Average Event Scale: ${avgScale} guests
`.trim();

  const vector = await generateEmbedding(activityText);
  const hash = crypto.createHash('md5').update(activityText).digest('hex');

  return { vector, hash, text: activityText, activityCount: activities.length };
}

/**
 * Upsert a hotel's activity embedding into Qdrant hotels_activity_vectors.
 * Call this whenever a new HotelActivity document is created or updated.
 *
 * @param {string|ObjectId} hotelId
 */
export async function updateHotelActivityEmbedding(hotelId) {
  try {
    const { upsertVector, COLLECTIONS } = await import('../config/qdrant.js');
    const { vector, hash, activityCount } = await generateHotelActivityEmbedding(hotelId);

    await upsertVector(COLLECTIONS.HOTEL_ACTIVITY, hotelId.toString(), vector, {
      hotelId: hotelId.toString(),
      activityCount,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Hotel activity embedding updated for ${hotelId} (${activityCount} events)`);
  } catch (err) {
    // Non-critical: log but do not throw so the main request succeeds
    console.error('⚠️  Failed to update hotel activity embedding:', err.message);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 
 * @param {number[]} vec2 
 * @returns {number} - Similarity score (0-1)
 */
export function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Compute weighted average of vectors
 * @param {Array<{vector: number[], weight: number}>} weightedVectors 
 * @returns {number[]} - Average vector
 */
export function computeWeightedAverage(weightedVectors) {
  if (!weightedVectors || weightedVectors.length === 0) {
    return null;
  }

  const dimension = weightedVectors[0].vector.length;
  const result = new Array(dimension).fill(0);
  let totalWeight = 0;

  for (const { vector, weight } of weightedVectors) {
    for (let i = 0; i < dimension; i++) {
      result[i] += vector[i] * weight;
    }
    totalWeight += weight;
  }

  // Normalize
  if (totalWeight > 0) {
    for (let i = 0; i < dimension; i++) {
      result[i] /= totalWeight;
    }
  }

  return result;
}

/**
 * Combine two vectors with weights
 * @param {number[]} vec1 
 * @param {number[]} vec2 
 * @param {number} weight1 - Weight for vec1 (0-1)
 * @param {number} weight2 - Weight for vec2 (0-1)
 * @returns {number[]}
 */
export function combineVectors(vec1, vec2, weight1 = 0.5, weight2 = 0.5) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  const result = [];
  for (let i = 0; i < vec1.length; i++) {
    result.push(vec1[i] * weight1 + vec2[i] * weight2);
  }

  return result;
}

/**
 * Normalize a vector to unit length
 * @param {number[]} vector 
 * @returns {number[]}
 */
export function normalizeVector(vector) {
  let norm = 0;
  for (const val of vector) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);

  if (norm === 0) return vector;

  return vector.map((val) => val / norm);
}

/**
 * Get embedding statistics
 */
export function getEmbeddingStats() {
  return {
    cacheSize: embeddingCache.size,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

/**
 * Clear embedding cache
 */
export function clearEmbeddingCache() {
  embeddingCache.clear();
  console.log('🧹 Embedding cache cleared');
}

export default openai;
