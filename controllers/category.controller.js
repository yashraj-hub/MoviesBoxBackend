const MovieCache = require('../models/MovieCache')
const { tmdbFetch, TMDB_IMG_BASE } = require('../services/tmdb.service')
const { CATEGORIES, CATEGORIES_BY_ZONE } = require('../config/categories')

const LIMIT = 20

const toMovie = (m) => ({
  tmdbId: m.tmdbId,
  title: m.title,
  posterPath: m.posterPath ? `${TMDB_IMG_BASE}${m.posterPath}` : null,
  backdropPath: m.backdropPath ? `${TMDB_IMG_BASE}${m.backdropPath}` : null,
  releaseDate: m.releaseDate,
  voteAverage: m.voteAverage,
})

const toMovieFromTmdb = (m) => ({
  tmdbId: m.id,
  title: m.title,
  posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
  backdropPath: m.backdrop_path ? `${TMDB_IMG_BASE}${m.backdrop_path}` : null,
  releaseDate: m.release_date,
  voteAverage: m.vote_average,
})

// GET /api/categories/:zone — list all slugs for a zone
exports.listByZone = (req, res) => {
  const { zone } = req.params
  const list = CATEGORIES_BY_ZONE[zone]
  if (!list) return res.status(400).json({ message: 'Invalid zone' })
  res.json({ categories: list.map(c => ({ slug: c.slug, label: c.label })) })
}

// GET /api/categories/:slug/movies?page=1
exports.getMovies = async (req, res, next) => {
  try {
    const { slug } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const skip = (page - 1) * LIMIT

    const cat = CATEGORIES[slug]
    if (!cat) return res.status(400).json({ message: 'Invalid category slug' })

    // TMDB se total pages pehle lo (page=1 fast hai)
    const tmdbData = await tmdbFetch('discover/movie', { ...cat.query, language: 'en-US', page })
    const tmdbResults = tmdbData.results || []
    const tmdbTotalPages = tmdbData.total_pages || 1
    const tmdbTotalResults = tmdbData.total_results || 0

    // Cache mein save karo async
    if (tmdbResults.length) {
      const ops = tmdbResults.map(m => ({
        updateOne: {
          filter: { tmdbId: m.id },
          update: {
            $set: {
              tmdbId: m.id,
              title: m.title,
              originalTitle: m.original_title,
              originalLanguage: m.original_language,
              overview: m.overview,
              posterPath: m.poster_path,
              backdropPath: m.backdrop_path,
              genreIds: m.genre_ids || [],
              releaseDate: m.release_date,
              popularity: m.popularity,
              voteAverage: m.vote_average,
              voteCount: m.vote_count,
              adult: m.adult,
              cachedAt: new Date(),
            },
          },
          upsert: true,
        },
      }))
      MovieCache.bulkWrite(ops).catch(() => {})
    }

    res.json({
      results: tmdbResults.map(toMovieFromTmdb),
      page,
      totalPages: tmdbTotalPages,
      totalResults: tmdbTotalResults,
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}
