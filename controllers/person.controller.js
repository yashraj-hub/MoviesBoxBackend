const { tmdbFetch, TMDB_IMG_BASE, TMDB_IMG_BACKDROP } = require('../services/tmdb.service')

const formatMovieRow = (m) => ({
  tmdbId: m.id,
  title: m.title || m.original_title || 'Untitled',
  posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
  backdropPath: m.backdrop_path ? `${TMDB_IMG_BACKDROP}${m.backdrop_path}` : null,
  releaseDate: m.release_date || null,
  voteAverage: m.vote_average != null ? Number(Number(m.vote_average).toFixed(1)) : null,
})

// GET /api/person/:personId/movies?credit=cast|director&page=1
// TMDB returns full credit lists (not pageable); we sort, dedupe, and slice.
exports.getPersonMovies = async (req, res, next) => {
  try {
    const personId = parseInt(req.params.personId, 10)
    const credit = String(req.query.credit || 'cast').toLowerCase()
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = 20

    if (!personId) return res.status(400).json({ message: 'Invalid person ID' })
    if (credit !== 'cast' && credit !== 'director') {
      return res.status(400).json({ message: 'credit must be cast or director' })
    }

    const data = await tmdbFetch(`person/${personId}/movie_credits`, { language: 'en-US' })

    let raw = []
    if (credit === 'cast') raw = data.cast || []
    else raw = (data.crew || []).filter((c) => c.job === 'Director')

    const byId = new Map()
    for (const m of raw) {
      if (!m?.id) continue
      if (!byId.has(m.id)) byId.set(m.id, m)
    }
    const unique = [...byId.values()]

    unique.sort((a, b) => {
      const da = a.release_date || ''
      const db = b.release_date || ''
      return db.localeCompare(da)
    })

    const total = unique.length
    const skip = (page - 1) * limit
    const slice = unique.slice(skip, skip + limit)

    res.json({
      results: slice.map(formatMovieRow),
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalResults: total,
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}
