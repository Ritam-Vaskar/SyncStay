import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rfpDetails: {
      requestedRooms: Number,
      requestedDates: {
        checkIn: Date,
        checkOut: Date,
      },
      specialRequests: String,
    },
    proposalDetails: {
      hotelName: String,
      roomTypes: [
        {
          type: { type: String },
          count: Number,
          pricePerNight: Number,
          inclusions: [String],
        },
      ],
      totalCost: Number,
      validUntil: Date,
      terms: String,
      cancellationPolicy: String,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'under-review', 'accepted', 'rejected'],
      default: 'pending',
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
proposalSchema.index({ event: 1, hotel: 1 });
proposalSchema.index({ status: 1 });

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;
