import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'planner', 'hotel', 'guest'],
      default: 'guest',
    },
    phone: {
      type: String,
      trim: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    // Hotel-specific fields
    location: {
      city: String,
      country: String,
      address: String,
    },
    totalRooms: {
      type: Number,
      min: 0,
    },
    specialization: [String], // ['conference', 'wedding', 'corporate', etc.]
    priceRange: {
      min: Number,
      max: Number,
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    // Vector database fields for recommendations
    vectorId: {
      type: String,
      index: true,
    },
    embeddingHash: {
      type: String,
    },
    preferredByPlanners: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    facilities: [String],
    description: String,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
