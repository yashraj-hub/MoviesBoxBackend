const MovieCache = require('../models/MovieCache')
const { tmdbFetch, TMDB_IMG_BASE, TMDB_IMG_BACKDROP, TMDB_IMG_FACE, TMDB_IMG_LOGO, TMDB_IMG_ORIGINAL } = require('../services/tmdb.service')

const pickLogo = (images) => {
  const logos = images?.logos || []
  const logo = logos.find(l => l.iso_639_1 === 'en') || logos[0]
  return logo?.file_path ? `${TMDB_IMG_LOGO}${logo.file_path}` : null
}

const formatMovie = (m) => ({
  tmdbId: m.id,
  imdbId: m.imdb_id || null,
  title: m.title,
  tagline: m.tagline || null,
  overview: m.overview || null,
  releaseDate: m.release_date || null,
  releaseYear: m.release_date?.slice(0, 4) || null,
  runtime: m.runtime || null,
  status: m.status || null,
  originalLanguage: m.original_language || null,
  voteAverage: m.vote_average ? Number(m.vote_average.toFixed(1)) : null,
  voteCount: m.vote_count || null,
  popularity: m.popularity || null,
  budget: m.budget || null,
  revenue: m.revenue || null,
  backdropUrl: m.backdrop_path ? `${TMDB_IMG_BACKDROP}${m.backdrop_path}` : null,
  posterUrl: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
  logoUrl: pickLogo(m.images),
  genres: (m.genres || []).map(g => g.name),
  genreIds: (m.genres || []).map((g) => g.id).filter((id) => id != null),
  productionCompanies: (m.production_companies || [])
    .filter(c => c.logo_path)
    .slice(0, 6)
    .map(c => ({ id: c.id, name: c.name, logoUrl: `${TMDB_IMG_LOGO}${c.logo_path}` })),
  cast: (m.credits?.cast || []).slice(0, 15).map(p => ({
    id: p.id,
    name: p.name,
    character: p.character,
    profileUrl: p.profile_path ? `${TMDB_IMG_FACE}${p.profile_path}` : null,
  })),
  directors: (m.credits?.crew || [])
    .filter(p => p.job === 'Director')
    .map(p => ({
      id: p.id,
      name: p.name,
      profileUrl: p.profile_path ? `${TMDB_IMG_FACE}${p.profile_path}` : null,
    })),
  trailerKey: (() => {
    const list = m.videos?.results || []
    const t = list.find(v => v.site === 'YouTube' && v.type === 'Trailer') || list.find(v => v.site === 'YouTube')
    return t?.key || null
  })(),
})

// GET /api/movies/:tmdbId
exports.getMovieDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId)
    if (!id) return res.status(400).json({ message: 'Invalid movie ID' })

    const data = await tmdbFetch(`movie/${id}`, {
      language: 'en-US',
      append_to_response: 'credits,videos,images',
      include_image_language: 'en,null',
    })

    res.json(formatMovie(data))
  } catch (err) {
    next(err)
  }
}

// GET /api/movies/:tmdbId/related?page=1
exports.getRelatedMovies = async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId)
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = 50
    const skip = (page - 1) * limit

    if (!id) return res.status(400).json({ message: 'Invalid movie ID' })

    // Try DB first — same category movies sorted by rating
    const source = await MovieCache.findOne({ tmdbId: id }).lean()
    const category = source?.category

    if (category) {
      const [results, total] = await Promise.all([
        MovieCache.find({ category, tmdbId: { $ne: id } })
          .sort({ voteAverage: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        MovieCache.countDocuments({ category, tmdbId: { $ne: id } }),
      ])

      if (results.length > 0) {
        return res.json({
          results: results.map(m => ({
            tmdbId: m.tmdbId,
            title: m.title,
            posterUrl: m.posterPath ? `${TMDB_IMG_BASE}${m.posterPath}` : null,
            releaseDate: m.releaseDate,
            voteAverage: m.voteAverage,
          })),
          page,
          totalPages: Math.ceil(total / limit),
          totalResults: total,
          source: 'db',
        })
      }
    }

    // TMDB fallback — similar movies
    const data = await tmdbFetch(`movie/${id}/similar`, { language: 'en-US', page })
    res.json({
      results: (data.results || []).map(m => ({
        tmdbId: m.id,
        title: m.title,
        posterUrl: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      })),
      page,
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || 0,
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}
