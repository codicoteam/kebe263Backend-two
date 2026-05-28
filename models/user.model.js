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
