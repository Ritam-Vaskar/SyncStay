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
    clientEmail: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
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
      airportCode: String, // Added for flight bookings (e.g., "DEL", "BOM")
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
    // Chat messages between admin and planner
    chatMessages: [{
      message: {
        type: String,
        required: true,
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      senderRole: {
        type: String,
        enum: ['admin', 'planner'],
        required: true,
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
      isRead: {
        type: Boolean,
        default: false,
      },
    }],
    // Keep adminComments for backward compatibility
    adminComments: [{
      comment: {
        type: String,
        required: true,
      },
      commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      commentedAt: {
        type: Date,
        default: Date.now,
      },
      isRead: {
        type: Boolean,
        default: false,
      },
      replies: [{
        reply: {
          type: String,
          required: true,
        },
        repliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        repliedAt: {
          type: Date,
          default: Date.now,
        },
      }],
    }],
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
    // Recommended hotels (AI-generated based on event criteria)
    recommendedHotels: [{
      hotel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      score: {
        type: Number,
        default: 0,
      },
      reasons: [String],
      addedAt: {
        type: Date,
        default: Date.now,
      },
      isSelectedByPlanner: {
        type: Boolean,
        default: false,
      },
    }],
    // Microsite access control
    micrositeAccessGranted: {
      type: Boolean,
      default: false,
    },
    micrositeAccessGrantedAt: {
      type: Date,
    },
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
      group: String,
      location: {
        type: String,
        enum: [
          '',
          'Mumbai (BOM)',
          'Delhi (DEL)',
          'Kolkata (CCU)',
          'Chennai (MAA)',
          'Bengaluru (BLR)',
          'Hyderabad (HYD)',
          'Ahmedabad (AMD)',
          'Pune (PNQ)',
          'Jaipur (JAI)',
          'Lucknow (LKO)',
          'Goa (GOI)',
          'Kochi (COK)',
          'Chandigarh (IXC)',
          'Guwahati (GAU)',
          'Bhubaneswar (BBI)',
          'Patna (PAT)',
          'Indore (IDR)',
          'Nagpur (NAG)',
          'Varanasi (VNS)',
          'Coimbatore (CJB)',
        ],
      },
      hasAccessed: {
        type: Boolean,
        default: false,
      },
      invitationToken: {
        type: String,
      },
      tokenExpiry: {
        type: Date,
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
    // Planner payment for private events (upfront payment to hotels)
    plannerPaymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'not-required'],
      default: 'not-required',
    },
    plannerPaymentAmount: {
      type: Number,
      default: 0,
    },
    plannerPaidAt: {
      type: Date,
    },
    plannerPaymentDetails: {
      transactionId: String,
      paymentMethod: String,
      paymentGateway: String,
      razorpay_order_id: String,
      razorpay_payment_id: String,
      razorpay_signature: String,
      lastPaymentAt: Date,
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
    // Vector database fields for recommendations
    vectorId: {
      type: String,
      index: true,
    },
    embeddingHash: {
      type: String,
    },
    popularityScore: {
      type: Number,
      default: 0,
    },
    viewCount: {
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
