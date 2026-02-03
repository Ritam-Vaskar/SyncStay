import mongoose from 'mongoose';

const hotelProposalSchema = new mongoose.Schema(
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
    hotelName: {
      type: String,
      required: true,
    },
    // Pricing and availability
    pricing: {
      singleRoom: {
        pricePerNight: Number,
        availableRooms: Number,
      },
      doubleRoom: {
        pricePerNight: Number,
        availableRooms: Number,
      },
      suite: {
        pricePerNight: Number,
        availableRooms: Number,
      },
    },
    totalRoomsOffered: {
      type: Number,
      required: true,
      min: 1,
    },
    // Facilities and amenities
    amenities: [{
      type: String,
    }],
    facilities: {
      wifi: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      breakfast: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      spa: { type: Boolean, default: false },
      restaurant: { type: Boolean, default: false },
      conferenceRoom: { type: Boolean, default: false },
      airportShuttle: { type: Boolean, default: false },
      laundry: { type: Boolean, default: false },
    },
    // Additional services
    additionalServices: {
      transportation: {
        available: Boolean,
        cost: Number,
        description: String,
      },
      catering: {
        available: Boolean,
        costPerPerson: Number,
        description: String,
      },
      avEquipment: {
        available: Boolean,
        cost: Number,
        description: String,
      },
      other: String,
    },
    // Special offers or notes
    specialOffer: {
      type: String,
    },
    notes: {
      type: String,
    },
    // Total package cost
    totalEstimatedCost: {
      type: Number,
    },
    // Status
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'selected', 'rejected'],
      default: 'submitted',
    },
    selectedByPlanner: {
      type: Boolean,
      default: false,
    },
    selectionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
hotelProposalSchema.index({ event: 1, hotel: 1 });
hotelProposalSchema.index({ status: 1 });

const HotelProposal = mongoose.model('HotelProposal', hotelProposalSchema);

export default HotelProposal;
