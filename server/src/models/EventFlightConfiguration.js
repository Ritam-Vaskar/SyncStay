import mongoose from 'mongoose';

const eventFlightConfigurationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      unique: true,
    },
    planner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Event Location (Destination)
    eventLocation: {
      city: String,
      airportCode: String, // Destination airport
      country: String,
    },
    // Location Groups (Auto-generated from guest list)
    locationGroups: [
      {
        groupName: String, // e.g., "Delhi Group", "Mumbai Group"
        origin: {
          type: String,
          required: true, // Airport code (e.g., "DEL", "BOM")
        },
        city: String,
        guestsCount: {
          type: Number,
          default: 0,
        },
        guests: [
          {
            name: String,
            email: String,
            phone: String,
          },
        ],
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    // Flight Search Window
    searchWindow: {
      // Arrival flights window (2-3 days before event start)
      arrivalSearchStart: {
        type: Date,
        required: true,
      },
      arrivalSearchEnd: {
        type: Date,
        required: true,
      },
      // Departure flights window (event end to 2-3 days after)
      departureSearchStart: {
        type: Date,
        required: true,
      },
      departureSearchEnd: {
        type: Date,
        required: true,
      },
    },
    // Selected Flight Options for Each Group
    selectedFlights: [
      {
        groupName: String,
        origin: String, // Airport code
        // Arrival Flight Options (Guest Origin → Event Location)
        arrivalFlights: [
          {
            traceId: String,
            resultIndex: String,
            flightDetails: {
              airline: String,
              airlineCode: String,
              flightNumber: String,
              origin: String,
              destination: String,
              departureTime: Date,
              arrivalTime: Date,
              duration: String,
              cabinClass: String,
              stops: Number,
              baggage: String,
              refundable: Boolean,
            },
            fare: {
              baseFare: Number,
              tax: Number,
              totalFare: Number,
              currency: String,
            },
            isAvailable: {
              type: Boolean,
              default: true,
            },
            selectedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        // Departure Flight Options (Event Location → Guest Origin)
        departureFlights: [
          {
            traceId: String,
            resultIndex: String,
            flightDetails: {
              airline: String,
              airlineCode: String,
              flightNumber: String,
              origin: String,
              destination: String,
              departureTime: Date,
              arrivalTime: Date,
              duration: String,
              cabinClass: String,
              stops: Number,
              baggage: String,
              refundable: Boolean,
            },
            fare: {
              baseFare: Number,
              tax: Number,
              totalFare: Number,
              currency: String,
            },
            isAvailable: {
              type: Boolean,
              default: true,
            },
            selectedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    // Configuration Status
    status: {
      type: String,
      enum: ['draft', 'in-progress', 'completed', 'published'],
      default: 'draft',
    },
    // Track which groups have flights configured
    configuredGroups: [String],
    // Publish status
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
    // Statistics
    stats: {
      totalGroups: {
        type: Number,
        default: 0,
      },
      configuredGroups: {
        type: Number,
        default: 0,
      },
      totalGuests: {
        type: Number,
        default: 0,
      },
      totalBookings: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
    },
    // Notes
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
eventFlightConfigurationSchema.index({ event: 1 });
eventFlightConfigurationSchema.index({ planner: 1 });
eventFlightConfigurationSchema.index({ status: 1 });
eventFlightConfigurationSchema.index({ isPublished: 1 });

// Virtual to calculate completion percentage
eventFlightConfigurationSchema.virtual('completionPercentage').get(function () {
  if (this.stats.totalGroups === 0) return 0;
  return Math.round((this.stats.configuredGroups / this.stats.totalGroups) * 100);
});

// Method to update stats
eventFlightConfigurationSchema.methods.updateStats = function () {
  this.stats.totalGroups = this.locationGroups.length;
  this.stats.configuredGroups = this.configuredGroups.length;
  this.stats.totalGuests = this.locationGroups.reduce((sum, group) => sum + group.guestsCount, 0);
  return this.save();
};

const EventFlightConfiguration = mongoose.model('EventFlightConfiguration', eventFlightConfigurationSchema);

export default EventFlightConfiguration;
