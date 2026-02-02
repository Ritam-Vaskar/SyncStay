import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
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
    roomType: {
      type: String,
      required: true,
      trim: true,
    },
    totalRooms: {
      type: Number,
      required: true,
      min: 1,
    },
    availableRooms: {
      type: Number,
      required: true,
      min: 0,
    },
    blockedRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    inclusions: [String], // e.g., ['Breakfast', 'WiFi', 'Airport Transfer']
    status: {
      type: String,
      enum: ['locked', 'available', 'released', 'sold-out'],
      default: 'locked',
    },
    releaseRules: {
      autoRelease: {
        type: Boolean,
        default: false,
      },
      releaseDate: Date,
      penaltyAmount: Number,
    },
    bookingVelocity: {
      type: Number,
      default: 0, // Rooms booked per day
    },
    lastBookedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent overbooking
inventorySchema.pre('save', function (next) {
  if (this.availableRooms < 0) {
    throw new Error('Available rooms cannot be negative');
  }
  if (this.availableRooms + this.blockedRooms > this.totalRooms) {
    throw new Error('Total allocated rooms exceed inventory');
  }
  next();
});

// Index for fast lookups
inventorySchema.index({ event: 1, hotel: 1 });
inventorySchema.index({ status: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);

export default Inventory;
