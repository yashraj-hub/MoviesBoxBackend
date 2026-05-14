const mongoose = require('mongoose')

const movieCacheSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    originalTitle: { type: String },
    originalLanguage: { type: String },
    overview: { type: String },
    posterPath: { type: String },
    backdropPath: { type: String },
    genreIds: [Number],
    releaseDate: { type: String },
    popularity: { type: Number },
    voteAverage: { type: Number },
    voteCount: { type: Number },
    adult: { type: Boolean },
    collectionId: { type: Number },
    collectionName: { type: String },
    category: { type: String, enum: ['bollywood', 'hollywood', 'animation'] },
    productionCompanyIds: [Number],
    lastSearchedAt: { type: Date },
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

movieCacheSchema.index({ title: 'text', originalTitle: 'text' })
movieCacheSchema.index({ originalLanguage: 1, voteAverage: -1 })
movieCacheSchema.index({ category: 1, voteAverage: -1 })
movieCacheSchema.index({ genreIds: 1, voteAverage: -1 })
movieCacheSchema.index({ productionCompanyIds: 1, voteAverage: -1 })

module.exports = mongoose.model('MovieCache', movieCacheSchema)
