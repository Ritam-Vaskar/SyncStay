import UserActivity from '../models/UserActivity.js';
import Event from '../models/Event.js';
import { retrieveVector, upsertVector, COLLECTIONS } from '../config/qdrant.js';
import { computeWeightedAverage } from '../services/embeddingService.js';

/**
 * Track user search activity
 */
export const trackSearch = async (req, res) => {
  try {
    const { searchQuery, matchedEntityIds } = req.body;
    const userId = req.user._id;

    const activity = await UserActivity.create({
      userId,
      type: 'search',
      entityType: 'event',
      searchQuery,
      matchedEntities: matchedEntityIds || [],
      weight: UserActivity.WEIGHTS.SEARCH,
    });

    // Update user vector asynchronously (don't block response)
    updateUserVectorAsync(userId);

    res.status(201).json({
      success: true,
      message: 'Search activity tracked',
      data: activity,
    });
  } catch (error) {
    console.error('Error tracking search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track search activity',
      error: error.message,
    });
  }
};

/**
 * Track user view activity
 */
export const trackView = async (req, res) => {
  try {
    const { entityId, entityType } = req.body;
    const userId = req.user._id;

    const activity = await UserActivity.create({
      userId,
      type: 'view',
      entityType: entityType || 'event',
      entityId,
      weight: UserActivity.WEIGHTS.VIEW,
    });

    // Increment view count on event
    if (entityType === 'event') {
      await Event.findByIdAndUpdate(entityId, { $inc: { viewCount: 1 } });
    }

    // Update user vector asynchronously
    updateUserVectorAsync(userId);

    res.status(201).json({
      success: true,
      message: 'View activity tracked',
      data: activity,
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view activity',
      error: error.message,
    });
  }
};

/**
 * Track user bookmark activity
 */
export const trackBookmark = async (req, res) => {
  try {
    const { entityId, entityType } = req.body;
    const userId = req.user._id;

    const activity = await UserActivity.create({
      userId,
      type: 'bookmark',
      entityType: entityType || 'event',
      entityId,
      weight: UserActivity.WEIGHTS.BOOKMARK,
    });

    // Update user vector asynchronously
    updateUserVectorAsync(userId);

    res.status(201).json({
      success: true,
      message: 'Bookmark activity tracked',
      data: activity,
    });
  } catch (error) {
    console.error('Error tracking bookmark:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track bookmark activity',
      error: error.message,
    });
  }
};

/**
 * Track user booking activity
 */
export const trackBooking = async (req, res) => {
  try {
    const { entityId, entityType } = req.body;
    const userId = req.user._id;

    const activity = await UserActivity.create({
      userId,
      type: 'book',
      entityType: entityType || 'event',
      entityId,
      weight: UserActivity.WEIGHTS.BOOK,
    });

    // Update user vector asynchronously
    updateUserVectorAsync(userId);

    res.status(201).json({
      success: true,
      message: 'Booking activity tracked',
      data: activity,
    });
  } catch (error) {
    console.error('Error tracking booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track booking activity',
      error: error.message,
    });
  }
};

/**
 * Get user activity history
 */
export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, type } = req.query;

    const query = { userId };
    if (type) query.type = type;

    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('entityId', 'name type location');

    res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message,
    });
  }
};

/**
 * Update user vector based on activities (async helper)
 */
async function updateUserVectorAsync(userId) {
  try {
    // Get recent activities (last 50)
    const activities = await UserActivity.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50);

    if (activities.length === 0) return;

    // Fetch event vectors for all activities
    const weightedVectors = [];

    for (const activity of activities) {
      if (!activity.entityId) continue;

      const vectorData = await retrieveVector(
        COLLECTIONS.EVENTS,
        activity.entityId.toString()
      );

      if (vectorData && vectorData.vector) {
        const decayFactor = activity.getDecayFactor();
        const effectiveWeight = activity.weight * decayFactor;

        weightedVectors.push({
          vector: vectorData.vector,
          weight: effectiveWeight,
        });
      }
    }

    if (weightedVectors.length === 0) return;

    // Compute weighted average
    const userVector = computeWeightedAverage(weightedVectors);

    if (userVector) {
      // Store in Qdrant
      await upsertVector(COLLECTIONS.USERS, userId.toString(), userVector, {
        activityCount: activities.length,
        lastUpdated: new Date().toISOString(),
      });

      console.log(`✅ Updated user vector for user ${userId}`);
    }
  } catch (error) {
    console.error('Error updating user vector:', error);
  }
}

export default {
  trackSearch,
  trackView,
  trackBookmark,
  trackBooking,
  getUserActivity,
};
