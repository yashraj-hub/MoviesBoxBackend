const mongoose = require('mongoose')
const analyticsConn = require('../config/databases/analytics')

const watchMovieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true },
    title: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    watchSeconds: { type: Number, default: 0 },
    originalLanguage: { type: String, default: '' },
    genreIds: { type: [Number], default: [] },
  },
  { _id: false },
)

const dailyWatchStatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true }, // yyyy-mm-dd (IST)
    dayStartAt: { type: Date, required: true, index: true },
    totalWatchSeconds: { type: Number, default: 0 },
    movies: { type: [watchMovieSchema], default: [] },
    taste: {
      genres: {
        type: [
          new mongoose.Schema(
            {
              id: Number,
              watchSeconds: Number,
            },
            { _id: false },
          ),
        ],
        default: [],
      },
      languages: {
        type: [
          new mongoose.Schema(
            {
              code: String,
              watchSeconds: Number,
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'daily_watch_stats',
  },
)

dailyWatchStatSchema.index({ userId: 1, dayKey: 1 }, { unique: true })
dailyWatchStatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = analyticsConn.model('DailyWatchStat', dailyWatchStatSchema)
