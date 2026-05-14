const MovieCache = require('../models/MovieCache')
const { tmdbFetch, saveToCache, TMDB_IMG_BASE, TMDB_IMG_BACKDROP, TMDB_IMG_LOGO } = require('../services/tmdb.service')
const { PRODUCTION_HOUSES, CATEGORY_FILTERS } = require('../config/productionHouses')

const LOGO_OVERRIDES = {
  420: 'https://www.marvel.com/assets/marvel-logo.svg',
}
const LIMIT = 20

const toMovie = (m) => ({
  tmdbId: m.tmdbId,
  title: m.title,
  posterPath: m.posterPath ? `${TMDB_IMG_BASE}${m.posterPath}` : null,
  backdropPath: m.backdropPath ? `${TMDB_IMG_BACKDROP}${m.backdropPath}` : null,
  releaseDate: m.releaseDate,
  voteAverage: m.voteAverage,
})

// In-memory logo cache to avoid hitting TMDB on every request
const logoCache = {}

// GET /api/production-house/:category
exports.listByCategory = async (req, res, next) => {
  try {
    const { category } = req.params
    const houses = PRODUCTION_HOUSES[category]
    if (!houses) return res.status(400).json({ message: 'Invalid category' })

    const withLogos = await Promise.all(
      houses.map(async (h) => {
        // Override first
        if (LOGO_OVERRIDES[h.id]) return { ...h, logoUrl: LOGO_OVERRIDES[h.id] }
        // Memory cache hit
        if (logoCache[h.id] !== undefined) return { ...h, logoUrl: logoCache[h.id] }
        // Fetch from TMDB with timeout
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 4000)
          const data = await tmdbFetch(`company/${h.id}`)
          clearTimeout(timer)
          const url = data.logo_path ? `${TMDB_IMG_LOGO}${data.logo_path}` : null
          logoCache[h.id] = url
          return { ...h, logoUrl: url }
        } catch {
          logoCache[h.id] = null
          return { ...h, logoUrl: null }
        }
      })
    )

    res.json({ houses: withLogos })
  } catch (err) {
    next(err)
  }
}

// GET /api/production-house/:category/:companyId/movies?page=1
// DB first → TMDB fallback
exports.getMovies = async (req, res, next) => {
  try {
    const { category, companyId } = req.params
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const skip = (page - 1) * LIMIT
    const id = parseInt(companyId)

    if (!PRODUCTION_HOUSES[category]) {
      return res.status(400).json({ message: 'Invalid category' })
    }

    const categoryFilters = CATEGORY_FILTERS[category] || {}

    // 1. Try DB
    const [dbMovies, dbTotal] = await Promise.all([
      MovieCache.find({ productionCompanyIds: id })
        .sort({ voteAverage: -1 })
        .skip(skip)
        .limit(LIMIT)
        .lean(),
      MovieCache.countDocuments({ productionCompanyIds: id }),
    ])

    if (dbMovies.length > 0) {
      const dbTotalPages = Math.ceil(dbTotal / LIMIT)
      // Fetch TMDB total_pages in background to tell frontend how much more exists
      const tmdbMeta = await tmdbFetch('discover/movie', {
        with_companies: id, sort_by: 'popularity.desc', page: 1, ...categoryFilters,
      }).catch(() => ({ total_pages: dbTotalPages }))
      return res.json({
        results: dbMovies.map(toMovie),
        page,
        totalResults: dbTotal,
        totalPages: dbTotalPages,
        tmdbTotalPages: tmdbMeta.total_pages || dbTotalPages,
        source: 'db',
      })
    }

    // 2. TMDB fallback
    const data = await tmdbFetch('discover/movie', {
      with_companies: id,
      sort_by: 'popularity.desc',
      page,
      ...categoryFilters,
    })

    const results = data.results || []
    // Inject companyId since discover response doesn't include production_companies
    const resultsWithCompany = results.map(m => ({
      ...m,
      production_companies: [{ id }],
    }))
    saveToCache(resultsWithCompany, category).catch(() => {})

    res.json({
      results: results.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
        backdropPath: m.backdrop_path ? `${TMDB_IMG_BACKDROP}${m.backdrop_path}` : null,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      })),
      page,
      totalResults: data.total_results || 0,
      totalPages: data.total_pages || 1,
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/company/:companyId/movies?page=1
// Any TMDB company (logos on movie detail). Cached DB first, else TMDB discover (no zone filter).
exports.getCompanyMovies = async (req, res, next) => {
  try {
    const id = parseInt(req.params.companyId, 10)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const skip = (page - 1) * LIMIT

    if (!id) return res.status(400).json({ message: 'Invalid company ID' })

    const [dbMovies, dbTotal] = await Promise.all([
      MovieCache.find({ productionCompanyIds: id })
        .sort({ voteAverage: -1 })
        .skip(skip)
        .limit(LIMIT)
        .lean(),
      MovieCache.countDocuments({ productionCompanyIds: id }),
    ])

    if (dbTotal > 0) {
      const dbTotalPages = Math.ceil(dbTotal / LIMIT)
      return res.json({
        results: dbMovies.map(toMovie),
        page,
        totalResults: dbTotal,
        totalPages: dbTotalPages,
        source: 'db',
      })
    }

    const data = await tmdbFetch('discover/movie', {
      with_companies: id,
      sort_by: 'popularity.desc',
      page,
      language: 'en-US',
    })

    const results = data.results || []
    const resultsWithCompany = results.map((m) => ({
      ...m,
      production_companies: [{ id }],
    }))
    saveToCache(resultsWithCompany, null).catch(() => {})

    res.json({
      results: results.map((m) => ({
        tmdbId: m.id,
        title: m.title,
        posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
        backdropPath: m.backdrop_path ? `${TMDB_IMG_BACKDROP}${m.backdrop_path}` : null,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      })),
      page,
      totalResults: data.total_results || 0,
      totalPages: data.total_pages || 1,
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}
