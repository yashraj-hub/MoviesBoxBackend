const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    trackingEnabled: {
      type: Boolean,
      default: true,
    },
    lastSiteActiveAt: {
      type: Date,
      default: null,
    },
    myList: {
      type: [
        new mongoose.Schema(
          {
            tmdbId: { type: Number, required: true },
            title: { type: String, default: '' },
            posterUrl: { type: String, default: '' },
            addedAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    watchProgress: {
      type: [
        new mongoose.Schema(
          {
            tmdbId: { type: Number, required: true },
            title: { type: String, default: '' },
            posterUrl: { type: String, default: '' },
            progress: { type: Number, default: 0, min: 0, max: 100 },
            watchSeconds: { type: Number, default: 0, min: 0 },
            lastWatchedAt: { type: Date, default: Date.now },
            originalLanguage: { type: String, default: '' },
            genreIds: { type: [Number], default: [] },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    sessions: {
      type: [
        new mongoose.Schema(
          {
            tokenId: { type: String, required: true },
            userAgent: { type: String, default: '' },
            platform: { type: String, default: '' },
            ip: { type: String, default: '' },
            loggedInAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    avatar: {
      type: String,
      default: '',
    },
    signupContext: {
      client: {
        type: new mongoose.Schema(
          {
            userAgent: { type: String, default: '' },
            platform: { type: String, default: '' },
            language: { type: String, default: '' },
            languages: { type: [String], default: [] },
            timezone: { type: String, default: '' },
            screen: { type: String, default: '' },
            screenDetail: { type: String, default: '' },
            deviceMemory: { type: String, default: '' },
            hardwareConcurrency: { type: Number, default: null },
            touchPoints: { type: Number, default: null },
            vendor: { type: String, default: '' },
            cookieEnabled: { type: Boolean, default: null },
            online: { type: Boolean, default: null },
            colorScheme: { type: String, default: '' },
            connection: { type: String, default: '' },
            referrer: { type: String, default: '' },
            pageUrl: { type: String, default: '' },
          },
          { _id: false },
        ),
        default: () => ({}),
      },
      server: {
        type: new mongoose.Schema(
          {
            ip: { type: String, default: '' },
            forwardedFor: { type: String, default: '' },
          },
          { _id: false },
        ),
        default: () => ({}),
      },
      recordedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('User', userSchema)
