const mongoose = require('mongoose')

const tvShowCacheSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    originalName: { type: String, default: '' },
    originalLanguage: { type: String, default: '' },
    overview: { type: String, default: '' },
    posterPath: { type: String, default: '' },
    backdropPath: { type: String, default: '' },
    genreIds: { type: [Number], default: [] },
    networkIds: { type: [Number], default: [] },
    originCountry: { type: [String], default: [] },
    firstAirDate: { type: String, default: '' },
    popularity: { type: Number, default: 0 },
    voteAverage: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    numberOfSeasons: { type: Number, default: null },
    numberOfEpisodes: { type: Number, default: null },
    status: { type: String, default: '' },
    type: { type: String, default: '' },
    shelfKeys: { type: [String], default: [] },
    lastDiscoveredAt: { type: Date, default: Date.now },
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

tvShowCacheSchema.index({ name: 'text', originalName: 'text' })
tvShowCacheSchema.index({ originalLanguage: 1, voteAverage: -1 })
tvShowCacheSchema.index({ genreIds: 1, voteAverage: -1 })
tvShowCacheSchema.index({ networkIds: 1, popularity: -1 })
tvShowCacheSchema.index({ originCountry: 1, popularity: -1 })
tvShowCacheSchema.index({ shelfKeys: 1, popularity: -1 })
tvShowCacheSchema.index({ firstAirDate: -1 })

module.exports = mongoose.model('TVShowCache', tvShowCacheSchema)
