import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['search', 'view', 'bookmark', 'add_to_cart', 'book'],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['event', 'hotel'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'entityType',
      index: true,
    },
    searchQuery: {
      type: String,
    },
    matchedEntities: [{
      type: mongoose.Schema.Types.ObjectId,
    }],
    weight: {
      type: Number,
      required: true,
      default: 0.2,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ userId: 1, type: 1 });
userActivitySchema.index({ entityId: 1, type: 1 });

// TTL index - auto-delete activities older than 90 days
userActivitySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// Static method to get activity weights
userActivitySchema.statics.WEIGHTS = {
  SEARCH: 0.2,
  VIEW: 0.4,
  BOOKMARK: 0.6,
  ADD_TO_CART: 0.7,
  BOOK: 1.0,
};

// Instance method to calculate decay factor
userActivitySchema.methods.getDecayFactor = function () {
  const ageInDays = (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: weight reduces by half every 30 days
  return Math.exp(-ageInDays / 30);
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
