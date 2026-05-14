const mongoose = require('mongoose')
const dns = require('dns')

// Force IPv4 to prevent "fetch failed" errors on TMDB
dns.setDefaultResultOrder('ipv4first')

require('dotenv').config()

const TMDB_TOKEN = process.env.TMDB_TOKEN
const MONGO_URI = process.env.MONGO_URI

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
    cachedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

movieCacheSchema.index({ title: 'text', originalTitle: 'text' })
movieCacheSchema.index({ originalLanguage: 1, voteAverage: -1 })
movieCacheSchema.index({ category: 1, voteAverage: -1 })
movieCacheSchema.index({ tmdbId: 1 })

const MovieCache = mongoose.model('MovieCache', movieCacheSchema)

const CATEGORIES = [
  {
    name: 'bollywood',
    query: 'with_original_language=hi&vote_count.gte=50&vote_average.gte=6',
    pages: 22,
  },
  {
    name: 'hollywood',
    query: 'with_original_language=en&vote_count.gte=500&vote_average.gte=6',
    pages: 264,
  },
  {
    name: 'animation',
    query: 'with_genres=16&vote_count.gte=100&vote_average.gte=6',
    pages: 88,
  },
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchPage(category, page) {
  const url = `https://api.themoviedb.org/3/discover/movie?sort_by=vote_average.desc&page=${page}&${category.query}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
  })
  return response.json()
}

async function saveMovies(movies, categoryName) {
  const operations = movies.map((movie) => ({
    updateOne: {
      filter: { tmdbId: movie.id },
      update: {
        $set: {
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          originalLanguage: movie.original_language,
          overview: movie.overview,
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          genreIds: movie.genre_ids,
          releaseDate: movie.release_date,
          popularity: movie.popularity,
          voteAverage: movie.vote_average,
          voteCount: movie.vote_count,
          adult: movie.adult,
          collectionId: movie.belongs_to_collection?.id || null,
          collectionName: movie.belongs_to_collection?.name || null,
          category: categoryName,
          cachedAt: new Date(),
        },
      },
      upsert: true,
    },
  }))

  if (operations.length > 0) {
    await MovieCache.bulkWrite(operations)
  }
}

async function fetchCategory(category) {
  console.log(`\n📦 Fetching ${category.name} (${category.pages} pages)...`)
  let totalSaved = 0

  for (let page = 1; page <= category.pages; page++) {
    try {
      const data = await fetchPage(category, page)
      await saveMovies(data.results || [], category.name)
      totalSaved += data.results?.length || 0

      console.log(
        `  ✓ Page ${page}/${category.pages} - ${data.results?.length || 0} movies saved (total: ${totalSaved})`
      )

      // Rate limit: 40 requests per 10 seconds = 250ms delay
      await delay(250)
    } catch (error) {
      console.error(`  ✗ Error on page ${page}:`, error.message)
      await delay(1000) // Wait longer on error
    }
  }

  console.log(`✅ ${category.name} complete: ${totalSaved} movies saved`)
  return totalSaved
}

async function main() {
  console.log('🚀 Starting TMDB bulk fetch...\n')

  await mongoose.connect(MONGO_URI)
  console.log('✓ Connected to MongoDB\n')

  let grandTotal = 0

  for (const category of CATEGORIES) {
    const count = await fetchCategory(category)
    grandTotal += count
  }

  const finalCount = await MovieCache.countDocuments()

  console.log('\n' + '='.repeat(50))
  console.log(`🎉 Bulk fetch complete!`)
  console.log(`📊 Total movies in DB: ${finalCount}`)
  console.log(`📊 Movies fetched this run: ${grandTotal}`)
  console.log('='.repeat(50))

  await mongoose.disconnect()
  process.exit(0)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
