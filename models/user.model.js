const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Public identity shown in chat/search instead of real name, so strangers
    // can't look up a customer/provider by their legal name. `unique` + `sparse`
    // lets pre-migration accounts (no username yet) coexist without colliding
    // on the shared `null` value while the backfill script runs.
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'],
    },
    // True for accounts backfilled with an auto-generated username (pre-migration
    // users) — the frontend prompts these users to pick a real one once.
    usernamePlaceholder: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    roles: {
      type: [
        {
          type: String,
          enum: ['customer', 'serviceProvider'],
        },
      ],
      default: [],
      validate: {
        validator: function (roles) {
          if (this.isAdmin && roles.length > 0) return false;
          return true;
        },
        message: 'Admin users cannot hold customer or serviceProvider roles',
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    kycDocuments: [{ type: String }],
    kycReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    kycReviewedAt: { type: Date, default: null },
    kycComments: { type: String, default: null },
    profileImage: {
      type: String,
      default: null,
    },
    otp: {
      type: String,
      select: false,
    },
    otpExpiry: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fcmTokens: {
      type: [String],
      default: [],
      select: false,
    },
    favorites: {
      type: [
        {
          listingId: { type: String },
          listingKind: { type: String, enum: ['vehicle', 'accommodation', 'service'] },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpiry;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
