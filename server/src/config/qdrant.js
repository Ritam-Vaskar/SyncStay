import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

// Collection names
export const COLLECTIONS = {
  EVENTS: 'events_vectors',
  HOTELS: 'hotels_vectors',
  HOTEL_ACTIVITY: 'hotels_activity_vectors',
  USERS: 'users_vectors',
  PLANNERS: 'planners_vectors',
};

// Vector dimension for text-embedding-3-small
export const VECTOR_SIZE = 1536;

/**
 * Initialize all Qdrant collections
 */
export async function initializeCollections() {
  try {
    console.log('🔄 Initializing Qdrant collections...');

    const collections = Object.values(COLLECTIONS);

    for (const collectionName of collections) {
      try {
        // Check if collection exists
        await qdrantClient.getCollection(collectionName);
        console.log(`✅ Collection "${collectionName}" already exists`);
      } catch (error) {
        // Create collection if it doesn't exist
        await qdrantClient.createCollection(collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
        console.log(`✅ Created collection "${collectionName}"`);
      }
    }

    console.log('✅ All Qdrant collections initialized');

    // Ensure payload indexes exist for filtered searches
    try {
      await qdrantClient.createPayloadIndex(COLLECTIONS.HOTELS, {
        field_name: 'country',
        field_schema: 'keyword',
      });
      console.log('✅ Payload index on hotels_vectors.country ready');
    } catch { /* already exists — ignore */ }

    return true;
  } catch (error) {
    console.error('❌ Error initializing Qdrant collections:', error);
    return false;
  }
}

/**
 * Convert MongoDB ObjectId to UUID format
 * Qdrant requires UUIDs or unsigned integers
 */
function objectIdToUUID(objectId) {
  const hex = objectId.toString();
  // Pad to 32 characters (UUID without dashes)
  const paddedHex = hex.padEnd(32, '0');
  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${paddedHex.slice(0, 8)}-${paddedHex.slice(8, 12)}-${paddedHex.slice(12, 16)}-${paddedHex.slice(16, 20)}-${paddedHex.slice(20, 32)}`;
}

/**
 * Convert UUID back to MongoDB ObjectId
 * Reverses the objectIdToUUID conversion
 */
export function uuidToObjectId(uuid) {
  // Remove dashes from UUID
  const hex = uuid.replace(/-/g, '');
  // Extract original ObjectId (first 24 characters)
  return hex.slice(0, 24);
}

/**
 * Upsert a vector into a collection
 */
export async function upsertVector(collectionName, id, vector, payload = {}) {
  try {
    const uuid = objectIdToUUID(id);
    await qdrantClient.upsert(collectionName, {
      wait: true,
      points: [
        {
          id: uuid,
          vector,
          payload,
        },
      ],
    });
    return true;
  } catch (error) {
    console.error(`Error upserting vector to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Retrieve a vector by ID
 */
export async function retrieveVector(collectionName, id) {
  try {
    const uuid = objectIdToUUID(id);
    const result = await qdrantClient.retrieve(collectionName, {
      ids: [uuid],
      with_vector: true,
      with_payload: true,
    });

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error retrieving vector from ${collectionName}:`, error);
    return null;
  }
}

/**
 * Search for similar vectors
 */
export async function searchVectors(collectionName, vector, limit = 10, filter = null) {
  try {
    const searchParams = {
      vector,
      limit,
      with_payload: true,
      with_vector: false,
    };

    if (filter) {
      searchParams.filter = filter;
    }

    const results = await qdrantClient.search(collectionName, searchParams);
    return results;
  } catch (error) {
    console.error(`Error searching vectors in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a vector by ID
 */
export async function deleteVector(collectionName, id) {
  try {
    await qdrantClient.delete(collectionName, {
      wait: true,
      points: [id.toString()],
    });
    return true;
  } catch (error) {
    console.error(`Error deleting vector from ${collectionName}:`, error);
    return false;
  }
}

/**
 * Batch upsert vectors
 */
export async function batchUpsertVectors(collectionName, points) {
  try {
    await qdrantClient.upsert(collectionName, {
      wait: true,
      points: points.map((point) => ({
        id: objectIdToUUID(point.id),
        vector: point.vector,
        payload: point.payload || {},
      })),
    });
    return true;
  } catch (error) {
    console.error(`Error batch upserting vectors to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get collection info
 */
export async function getCollectionInfo(collectionName) {
  try {
    const info = await qdrantClient.getCollection(collectionName);
    return info;
  } catch (error) {
    console.error(`Error getting collection info for ${collectionName}:`, error);
    return null;
  }
}

export default qdrantClient;
