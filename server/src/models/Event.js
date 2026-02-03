import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['conference', 'wedding', 'corporate', 'exhibition', 'other'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    planner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    location: {
      city: String,
      country: String,
      venue: String,
    },
    expectedGuests: {
      type: Number,
      required: true,
      min: 1,
    },
    bookingDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending-approval', 'rfp-published', 'reviewing-proposals', 'active', 'completed', 'cancelled', 'rejected'],
      default: 'draft',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    // Selected hotels for this event
    selectedHotels: [{
      hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      proposal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HotelProposal',
      },
    }],
    // Accommodation requirements
    accommodationNeeds: {
      totalRooms: Number,
      roomTypes: {
        single: Number,
        double: Number,
        suite: Number,
      },
      preferredHotels: [String],
      amenitiesRequired: [String],
    },
    // Additional services needed
    additionalServices: {
      transportation: Boolean,
      catering: Boolean,
      avEquipment: Boolean,
      other: String,
    },
    specialRequirements: {
      type: String,
    },
    budget: {
      type: Number,
    },
    pricingTiers: [
      {
        name: String, // e.g., 'VIP', 'Standard'
        description: String,
        basePrice: Number,
        discount: Number,
      },
    ],
    guestEligibilityRules: {
      requireApproval: {
        type: Boolean,
        default: false,
      },
      allowedDomains: [String], // Email domains
      maxGuestsPerBooking: {
        type: Number,
        default: 1,
      },
    },
    // Private event management
    isPrivate: {
      type: Boolean,
      default: false,
    },
    invitedGuests: [{
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: String,
      accessCode: {
        type: String,
        unique: true,
        sparse: true,
      },
      hasAccessed: {
        type: Boolean,
        default: false,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    totalGuestCost: {
      type: Number,
      default: 0,
    },
    plannerPaidAmount: {
      type: Number,
      default: 0,
    },
    micrositeConfig: {
      isPublished: {
        type: Boolean,
        default: false,
      },
      customSlug: {
        type: String,
        unique: true,
        sparse: true,
      },
      theme: {
        primaryColor: String,
        logo: String,
        bannerImage: String,
      },
      customDomain: String,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
eventSchema.index({ planner: 1, status: 1 });
eventSchema.index({ 'micrositeConfig.customSlug': 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
