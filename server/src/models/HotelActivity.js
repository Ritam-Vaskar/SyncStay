import mongoose from 'mongoose';

/**
 * HotelActivity — tracks every event a hotel has participated in.
 * Created when:
 *   (a) A HotelProposal is selected by a planner (status → 'selected')
 *   (b) An Event reaches status 'completed'
 *
 * These documents are aggregated to build a per-hotel cumulative activity
 * embedding stored in Qdrant `hotels_activity_vectors`, enabling semantic
 * matching like: "hotel hosted tech conferences → recommend for next tech summit".
 */
const hotelActivitySchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },

    // Denormalized event fields (for embedding without re-populating)
    eventType: { type: String, default: '' },           // e.g. 'conference', 'wedding'
    eventName: { type: String, default: '' },
    eventScale: { type: String, enum: ['small', 'medium', 'large'], default: 'small' }, // small <100, medium 100-500, large 500+
    eventLocation: {
      city: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    eventDate: { type: Date },

    // Outcome
    outcome: {
      type: String,
      enum: ['completed', 'cancelled', 'ongoing', 'selected'],
      default: 'selected',
    },
    bookingsCount: { type: Number, default: 0 },
    estimatedRevenue: { type: Number, default: 0 },

    // Source of this activity record
    source: {
      type: String,
      enum: ['proposal_selected', 'event_completed', 'backfill'],
      default: 'proposal_selected',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one record per (hotel, event) pair
hotelActivitySchema.index({ hotel: 1, event: 1 }, { unique: true });

const HotelActivity = mongoose.model('HotelActivity', hotelActivitySchema);
export default HotelActivity;
