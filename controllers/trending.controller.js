const TrendingCache = require('../models/TrendingCache')
const { tmdbFetch } = require('../services/tmdb.service')

const TMDB_ORIGINAL = 'https://image.tmdb.org/t/p/original'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const validWindows = new Set(['day', 'week'])
const validCategories = new Set(['bollywood', 'hollywood', 'animation', 'global'])

const normalizeWindow = (v) => (validWindows.has(v) ? v : 'day')

const pushUniqueWithPoster = (results, out, seen, limit) => {
  for (const m of results || []) {
    if (!m?.id || !m.poster_path) continue
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
    if (out.length >= limit) break
  }
}

const fetchGlobalTrending = async (window) => tmdbFetch(`trending/movie/${window}`, { language: 'en-US' })

const fetchDiscover = async (query) => tmdbFetch('discover/movie', query)

const fetchCategoryTrending = async (category) => {
  const base = {
    language: 'en-US',
    include_adult: 'false',
    sort_by: 'popularity.desc',
  }

  if (category === 'bollywood') {
    // Strict: Hindi in IN, then fallback: any popular movies in IN to fill Top 10.
    return [
      { ...base, region: 'IN', with_original_language: 'hi', page: 1 },
      { ...base, region: 'IN', with_original_language: 'hi', page: 2 },
      { ...base, region: 'IN', page: 1 },
      { ...base, region: 'IN', page: 2 },
    ]
  }

  if (category === 'animation') {
    return [
      { ...base, region: 'US', with_genres: '16', page: 1 },
      { ...base, region: 'US', with_genres: '16', page: 2 },
    ]
  }

  // hollywood
  return [
    { ...base, region: 'US', with_original_language: 'en', page: 1 },
    { ...base, region: 'US', with_original_language: 'en', page: 2 },
  ]
}

const toItem = (m) => ({
  id: m.id,
  title: m.title,
  releaseDate: m.release_date ?? null,
  releaseYear: m.release_date ? m.release_date.slice(0, 4) : null,
  voteAverage: typeof m.vote_average === 'number' ? Number(m.vote_average.toFixed(1)) : null,
  posterUrl: m.poster_path ? `${TMDB_ORIGINAL}${m.poster_path}` : null,
  backdropUrl: m.backdrop_path ? `${TMDB_ORIGINAL}${m.backdrop_path}` : null,
})

exports.getTrendingTop10 = async (req, res, next) => {
  try {
    const category = (req.params.category || '').toLowerCase()
    if (!validCategories.has(category)) return res.status(400).json({ message: 'Invalid category' })

    const window = normalizeWindow((req.query.window || '').toLowerCase())

    const cached = await TrendingCache.findOne({ category, window }).lean()
    if (
      cached?.cachedAt &&
      Date.now() - new Date(cached.cachedAt).getTime() < ONE_DAY_MS &&
      Array.isArray(cached.items) &&
      cached.items.length >= 10
    ) {
      return res.json({ category, window, items: cached.items, cachedAt: cached.cachedAt, source: 'db' })
    }

    let picked = []
    const seen = new Set()

    if (category === 'global') {
      const data = await fetchGlobalTrending(window)
      pushUniqueWithPoster(data.results, picked, seen, 10)
    } else {
      const queries = await fetchCategoryTrending(category)
      for (const q of queries) {
        const d = await fetchDiscover(q)
        pushUniqueWithPoster(d.results, picked, seen, 10)
        if (picked.length >= 10) break
      }
    }

    const filtered = picked.slice(0, 10).map(toItem)

    await TrendingCache.updateOne(
      { category, window },
      { $set: { category, window, items: filtered, cachedAt: new Date() } },
      { upsert: true },
    )

    return res.json({ category, window, items: filtered, cachedAt: new Date(), source: 'tmdb' })
  } catch (err) {
    next(err)
  }
}
