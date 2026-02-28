import mongoose from 'mongoose';

const flightBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    guest: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: String,
    },
    locationGroup: {
      type: String,
      required: true,
    },
    // Flight Selection
    flightSelection: {
      arrival: {
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
        },
        fare: {
          baseFare: Number,
          tax: Number,
          totalFare: Number,
          currency: {
            type: String,
            default: 'INR',
          },
        },
        selectedAt: {
          type: Date,
          default: Date.now,
        },
      },
      departure: {
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
        },
        fare: {
          baseFare: Number,
          tax: Number,
          totalFare: Number,
          currency: {
            type: String,
            default: 'INR',
          },
        },
        selectedAt: {
          type: Date,
          default: Date.now,
        },
      },
    },
    // Passenger Details
    passengers: [
      {
        paxId: Number,
        title: {
          type: String,
          enum: ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'],
          required: true,
        },
        firstName: {
          type: String,
          required: true,
        },
        lastName: {
          type: String,
          required: true,
        },
        paxType: {
          type: String,
          enum: ['1', '2', '3'], // 1=Adult, 2=Child, 3=Infant
          default: '1',
        },
        gender: {
          type: String,
          enum: ['M', 'F', 'O'],
          required: true,
        },
        dateOfBirth: {
          type: Date,
          required: false,
        },
        contactNo: String,
        passportNo: String,
        passportExpiry: Date,
        nationality: String,
        // Optional SSR (Meal, Seat, Baggage)
        mealCode: String,
        seatNumber: String,
        baggageCode: String,
      },
    ],
    // TBO Booking Data
    tboBookingData: {
      arrivalBooking: {
        bookingId: Number,
        pnr: String,
        ticketStatus: String,
        ticketNumber: String,
        bookingResponse: mongoose.Schema.Types.Mixed,
        ticketResponse: mongoose.Schema.Types.Mixed,
        bookedAt: Date,
        ticketedAt: Date,
      },
      departureBooking: {
        bookingId: Number,
        pnr: String,
        ticketStatus: String,
        ticketNumber: String,
        bookingResponse: mongoose.Schema.Types.Mixed,
        ticketResponse: mongoose.Schema.Types.Mixed,
        bookedAt: Date,
        ticketedAt: Date,
      },
    },
    // Payment
    pricing: {
      arrivalFare: Number,
      departureFare: Number,
      totalFare: Number,
      tax: Number,
      discount: Number,
      totalAmount: Number,
      currency: {
        type: String,
        default: 'INR',
      },
    },
    isPaidByPlanner: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentDetails: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
      paidAt: Date,
      paymentMethod: String,
    },
    paidAt: Date,
    razorpay_payment_id: String,
    razorpay_order_id: String,
    status: {
      type: String,
      enum: ['pending', 'payment-pending', 'booked', 'ticketed', 'cancelled', 'failed'],
      default: 'pending',
    },
    // Cancellation
    cancellationReason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: String,
    // Notifications
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
    ticketEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique booking ID
flightBookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.bookingId = `FB${timestamp}${random}`;
  }
  next();
});

// Indexes for faster queries
flightBookingSchema.index({ event: 1, 'guest.email': 1 });
flightBookingSchema.index({ bookingId: 1 });
flightBookingSchema.index({ status: 1 });
flightBookingSchema.index({ paymentStatus: 1 });

const FlightBooking = mongoose.model('FlightBooking', flightBookingSchema);

export default FlightBooking;
