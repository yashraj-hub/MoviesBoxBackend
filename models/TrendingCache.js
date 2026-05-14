const mongoose = require('mongoose')

const trendingCacheSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ['bollywood', 'hollywood', 'animation', 'global'], required: true },
    window: { type: String, enum: ['day', 'week'], required: true },
    items: { type: Array, default: [] },
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

trendingCacheSchema.index({ category: 1, window: 1 }, { unique: true })
trendingCacheSchema.index({ cachedAt: -1 })

module.exports = mongoose.model('TrendingCache', trendingCacheSchema)
