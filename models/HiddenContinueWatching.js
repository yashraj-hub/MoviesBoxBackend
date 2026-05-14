const mongoose = require('mongoose')
const analyticsConn = require('../config/databases/analytics')

const hiddenContinueWatchingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tmdbId: { type: Number, required: true, index: true },
    hiddenAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'hidden_continue_watching',
  },
)

hiddenContinueWatchingSchema.index({ userId: 1, tmdbId: 1 }, { unique: true })

module.exports = analyticsConn.model('HiddenContinueWatching', hiddenContinueWatchingSchema)

