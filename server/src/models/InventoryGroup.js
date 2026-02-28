import mongoose from 'mongoose';

const inventoryGroupSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'manual',
    },
    category: {
      type: String,
      enum: ['friends', 'family', 'vip', 'colleagues', 'custom'],
    },
    number: {
      type: Number,
      required: [true, 'Number of people in group is required'],
      min: [1, 'Group must have at least 1 person'],
    },
    description: {
      type: String,
      trim: true,
    },
    members: [
      {
        guestEmail: String,
        guestName: String,
        relationshipType: String, // friend, family, colleague, vip, etc.
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Metadata for enrichment
    metadata: {
      averageBudget: Number,
      preferredAmenities: [String],
      specialRequests: String,
    },
    assignedHotels: [
      {
        hotel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        priority: {
          type: Number,
          default: 0,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Recommendation scores
    recommendations: [
      {
        hotel: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        groupScore: {
          type: Number,
          default: 0,
        },
        reasons: [String],
        reasonCategory: {
          type: String,
          enum: ['location', 'budget', 'specialty', 'capacity', 'history'],
        },
        computedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups
inventoryGroupSchema.index({ event: 1, type: 1 });
inventoryGroupSchema.index({ event: 1, category: 1 });

const InventoryGroup = mongoose.model('InventoryGroup', inventoryGroupSchema);

export default InventoryGroup;
