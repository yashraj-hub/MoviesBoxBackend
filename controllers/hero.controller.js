const HeroCache = require('../models/HeroCache')
const { tmdbFetch, TMDB_IMG_BASE, TMDB_IMG_BACKDROP, TMDB_IMG_LOGO } = require('../services/tmdb.service')

const TMDB_ORIGINAL = 'https://image.tmdb.org/t/p/original' // hero backdrop full quality rakhte hain

const validCategories = new Set(['bollywood', 'hollywood', 'animation'])
const RELEASED_STATUS = 'Released'
const MIN_RELEASE_YEAR = 1990
const MIN_RATING = 8
const MIN_VOTE_COUNT = 10

const toISODate = (d) => d.toISOString().slice(0, 10)

const parseISODate = (s) => {
  if (!s || typeof s !== 'string') return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? new Date(t) : null
}

const pickTrailerKey = (videos) => {
  const list = videos?.results || []
  const trailer = list.find(v => v.site === 'YouTube' && v.type === 'Trailer') || list.find(v => v.site === 'YouTube' && v.type === 'Teaser')
  return trailer?.key || null
}

const pickLogoPath = (images) => {
  const logos = images?.logos || []
  const logo = logos.find(l => l.iso_639_1 === 'en') || logos.find(l => !l.iso_639_1) || logos[0]
  return logo?.file_path || null
}

const companyLogos = (companies) =>
  (companies || [])
    .filter(c => c.logo_path)
    .slice(0, 8)
    .map(c => ({
      id: c.id,
      name: c.name,
      logoUrl: `${TMDB_IMG_LOGO}${c.logo_path}`,
    }))

const toHeroItem = (movie) => ({
  id: movie.id,
  title: movie.title,
  overview: movie.overview,
  releaseDate: movie.release_date ?? null,
  releaseYear: movie.release_date ? movie.release_date.slice(0, 4) : null,
  originalLanguage: movie.original_language,
  runtime: movie.runtime ?? null,
  voteAverage: typeof movie.vote_average === 'number' ? Number(movie.vote_average.toFixed(1)) : null,
  voteCount: typeof movie.vote_count === 'number' ? movie.vote_count : null,
  status: movie.status ?? null,
  backdropUrl: movie.backdrop_path
    ? `${TMDB_ORIGINAL}${movie.backdrop_path}`
    : (movie.poster_path ? `${TMDB_ORIGINAL}${movie.poster_path}` : null),
  posterUrl: movie.poster_path ? `${TMDB_ORIGINAL}${movie.poster_path}` : null,
  trailerKey: pickTrailerKey(movie.videos),
  logoUrl: (() => {
    const p = pickLogoPath(movie.images)
    return p ? `${TMDB_ORIGINAL}${p}` : null
  })(),
  productionCompanies: companyLogos(movie.production_companies),
})

const discoverBaseQuery = (category) => {
  const today = toISODate(new Date())
  const gte = `${MIN_RELEASE_YEAR}-01-01`
  const base = {
    language: 'en-US',
    include_adult: 'false',
    'primary_release_date.gte': gte,
    'primary_release_date.lte': today,
    'vote_average.gte': MIN_RATING,
    'vote_count.gte': MIN_VOTE_COUNT,
  }

  if (category === 'bollywood') {
    return {
      ...base,
      region: 'IN',
    }
  }

  if (category === 'animation') {
    return {
      ...base,
      region: 'US',
      with_genres: '16',
    }
  }

  return {
    ...base,
    region: 'US',
    with_original_language: 'en',
  }
}

const fetchHeroCandidates = async (category) => {
  const base = discoverBaseQuery(category)
  const [recent1, recent2, topRated] = await Promise.all([
    tmdbFetch('discover/movie', { ...base, page: 1, sort_by: 'primary_release_date.desc' }),
    tmdbFetch('discover/movie', { ...base, page: 2, sort_by: 'primary_release_date.desc' }),
    tmdbFetch('discover/movie', { ...base, page: 1, sort_by: 'vote_average.desc' }),
  ])

  const seen = new Set()
  const ids = []

  const pushFrom = (arr, take) => {
    for (const m of arr || []) {
      if (!m?.id) continue
      if (seen.has(m.id)) continue
      seen.add(m.id)
      ids.push(m.id)
      if (ids.length >= take) break
    }
  }

  pushFrom(recent1?.results, 4)
  pushFrom(topRated?.results, 8)
  pushFrom(recent2?.results, 10)

  return ids.slice(0, 8)
}

const fetchNowPlaying = async (category) => {
  const region = category === 'bollywood' ? 'IN' : 'US'
  return tmdbFetch('movie/now_playing', {
    language: 'en-US',
    page: 1,
    region,
  })
}

const isValidHeroMovie = (m) => {
  if (!m) return false
  if (m.status && m.status !== RELEASED_STATUS) return false
  const d = parseISODate(m.releaseDate)
  if (!d) return false
  if (d.getTime() > Date.now()) return false
  if (d.getUTCFullYear() < MIN_RELEASE_YEAR) return false
  if (typeof m.voteAverage === 'number' && m.voteAverage < MIN_RATING) return false
  if (typeof m.voteCount === 'number' && m.voteCount < MIN_VOTE_COUNT) return false
  return true
}

exports.getHeroByCategory = async (req, res, next) => {
  try {
    const category = (req.params.category || '').toLowerCase()
    if (!validCategories.has(category)) {
      return res.status(400).json({ message: 'Invalid category' })
    }

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const cached = await HeroCache.findOne({ category }).lean()

    if (
      cached?.cachedAt &&
      cached.cachedAt >= sixHoursAgo &&
      Array.isArray(cached.items) &&
      cached.items.length > 0 &&
      cached.items.every(isValidHeroMovie)
    ) {
      return res.json({ category, items: cached.items, cachedAt: cached.cachedAt, source: 'db' })
    }

    const ids = await fetchHeroCandidates(category)

    const details = await Promise.all(
      ids.map(id =>
        tmdbFetch(`movie/${id}`, {
          language: 'en-US',
          append_to_response: 'videos,images',
          include_image_language: 'en,null',
        }).catch(() => null),
      ),
    )

    let items = details.filter(Boolean).map(toHeroItem).filter(m => m.backdropUrl).filter(isValidHeroMovie)

    if (items.length === 0) {
      const nowPlaying = await fetchNowPlaying(category)
      const nowPlayingIds = (nowPlaying.results || []).slice(0, 8).map(m => m.id).filter(Boolean)
      const nowPlayingDetails = await Promise.all(
        nowPlayingIds.map(id =>
          tmdbFetch(`movie/${id}`, {
            language: 'en-US',
            append_to_response: 'videos,images',
            include_image_language: 'en,null',
          }).catch(() => null),
        ),
      )
      items = nowPlayingDetails.filter(Boolean).map(toHeroItem).filter(m => m.backdropUrl).filter(isValidHeroMovie)
    }

    await HeroCache.updateOne(
      { category },
      { $set: { category, items, cachedAt: new Date() } },
      { upsert: true },
    )

    return res.json({ category, items, cachedAt: new Date(), source: 'tmdb' })
  } catch (err) {
    next(err)
  }
}
