const mongoose = require('mongoose')

const heroCacheSchema = new mongoose.Schema(
  {
    category: { type: String, enum: ['bollywood', 'hollywood', 'animation'], required: true, unique: true },
    items: { type: Array, default: [] },
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

heroCacheSchema.index({ category: 1, cachedAt: -1 })

module.exports = mongoose.model('HeroCache', heroCacheSchema)
