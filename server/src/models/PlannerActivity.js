import mongoose from 'mongoose';

const plannerActivitySchema = new mongoose.Schema(
  {
    plannerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'hotel_viewed',
        'hotel_selected',
        'hotel_rejected',
        'proposal_viewed',
        'proposal_selected',
        'proposal_rejected',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['hotel', 'proposal'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['conference', 'wedding', 'corporate', 'exhibition', 'retreat', 'other'],
    },
    eventLocation: {
      city: String,
      country: String,
    },
    weight: {
      type: Number,
      required: true,
    },
    metadata: {
      score: Number,
      reasons: [String],
      position: Number, // Position in recommendation list
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

// Compound indexes
plannerActivitySchema.index({ plannerId: 1, timestamp: -1 });
plannerActivitySchema.index({ plannerId: 1, eventId: 1 });
plannerActivitySchema.index({ plannerId: 1, type: 1 });

// TTL index - keep for 1 year
plannerActivitySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Activity weights
plannerActivitySchema.statics.WEIGHTS = {
  HOTEL_VIEWED: 0.3,
  HOTEL_SELECTED: 1.0,
  HOTEL_REJECTED: -0.5,
  PROPOSAL_VIEWED: 0.2,
  PROPOSAL_SELECTED: 1.0,
  PROPOSAL_REJECTED: -0.3,
};

// Decay factor calculation
plannerActivitySchema.methods.getDecayFactor = function () {
  const ageInDays = (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60 * 24);
  // Slower decay for planner activities (half-life: 60 days)
  return Math.exp(-ageInDays / 60);
};

const PlannerActivity = mongoose.model('PlannerActivity', plannerActivitySchema);

export default PlannerActivity;
