import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    guestDetails: {
      name: String,
      email: String,
      phone: String,
    },
    roomDetails: {
      hotelName: String,
      roomType: String,
      numberOfRooms: {
        type: Number,
        required: true,
        min: 1,
      },
      checkIn: Date,
      checkOut: Date,
      numberOfNights: Number,
    },
    pricing: {
      pricePerNight: Number,
      totalNights: Number,
      subtotal: Number,
      tax: Number,
      discount: Number,
      totalAmount: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid',
    },
    specialRequests: {
      type: String,
      default: '',
    },
    confirmationCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique booking ID
bookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    this.bookingId = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  if (!this.confirmationCode && this.status === 'confirmed') {
    this.confirmationCode = `CONF${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
  next();
});

// Index for fast queries
bookingSchema.index({ event: 1, guest: 1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ status: 1, paymentStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
