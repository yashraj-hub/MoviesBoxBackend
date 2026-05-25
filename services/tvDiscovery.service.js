const TVShowCache = require('../models/TVShowCache')
const { tmdbFetch, TMDB_IMG_BASE, TMDB_IMG_BACKDROP, TMDB_IMG_LOGO } = require('./tmdb.service')

const clampPage = (value) => Math.max(1, parseInt(value, 10) || 1)
const clampLimit = (value, fallback = 20) => Math.min(40, Math.max(1, parseInt(value, 10) || fallback))

const parseIdList = (value) =>
  String(value || '')
    .split(',')
    .map((part) => parseInt(part, 10))
    .filter((n) => Number.isFinite(n))

const buildTvDbFilter = (query = {}) => {
  const filter = {}
  const genreIds = parseIdList(query.with_genres)
  const excludedGenreIds = parseIdList(query.without_genres)

  if (query.with_original_language) filter.originalLanguage = String(query.with_original_language)
  if (query.with_origin_country) {
    filter.originCountry = { $in: String(query.with_origin_country).split(',').filter(Boolean) }
  }
  if (genreIds.length) {
    filter.genreIds = genreIds.length === 1 ? genreIds[0] : { $in: genreIds }
  }
  const networkIds = parseIdList(query.with_networks)
  if (networkIds.length) {
    filter.networkIds = networkIds.length === 1 ? networkIds[0] : { $in: networkIds }
  }
  if (excludedGenreIds.length) {
    if (filter.genreIds && typeof filter.genreIds === 'object') {
      filter.genreIds = { ...filter.genreIds, $nin: excludedGenreIds }
    } else if (filter.genreIds != null) {
      filter.genreIds = { $in: [filter.genreIds], $nin: excludedGenreIds }
    } else {
      filter.genreIds = { $nin: excludedGenreIds }
    }
  }

  if (query['first_air_date.gte'] || query['first_air_date.lte']) {
    filter.firstAirDate = {}
    if (query['first_air_date.gte']) filter.firstAirDate.$gte = String(query['first_air_date.gte'])
    if (query['first_air_date.lte']) filter.firstAirDate.$lte = String(query['first_air_date.lte'])
  }

  if (query['vote_average.gte'] || query['vote_average.lte']) {
    filter.voteAverage = {}
    if (query['vote_average.gte']) filter.voteAverage.$gte = Number(query['vote_average.gte'])
    if (query['vote_average.lte']) filter.voteAverage.$lte = Number(query['vote_average.lte'])
  }

  if (query['vote_count.gte'] || query['vote_count.lte']) {
    filter.voteCount = {}
    if (query['vote_count.gte']) filter.voteCount.$gte = Number(query['vote_count.gte'])
    if (query['vote_count.lte']) filter.voteCount.$lte = Number(query['vote_count.lte'])
  }

  return filter
}

const buildTvDbSort = (query = {}) => {
  const sortBy = query.sort_by || 'popularity.desc'

  switch (sortBy) {
    case 'vote_average.desc':
      return { voteAverage: -1, voteCount: -1, popularity: -1, firstAirDate: -1 }
    case 'vote_average.asc':
      return { voteAverage: 1, voteCount: -1, popularity: -1, firstAirDate: -1 }
    case 'vote_count.desc':
      return { voteCount: -1, popularity: -1, voteAverage: -1, firstAirDate: -1 }
    case 'vote_count.asc':
      return { voteCount: 1, popularity: -1, voteAverage: -1, firstAirDate: -1 }
    case 'first_air_date.asc':
      return { firstAirDate: 1, popularity: -1, voteAverage: -1 }
    case 'first_air_date.desc':
      return { firstAirDate: -1, popularity: -1, voteAverage: -1 }
    default:
      return { popularity: -1, voteAverage: -1, voteCount: -1, firstAirDate: -1 }
  }
}

const normalizeShow = (show) => {
  if (!show || (!show.id && show.tmdbId == null)) return null
  const id = show.id ?? show.tmdbId
  const posterPath = show.poster_path ?? show.posterPath ?? ''
  const backdropPath = show.backdrop_path ?? show.backdropPath ?? ''
  const originalCountry = Array.isArray(show.origin_country)
    ? show.origin_country
    : Array.isArray(show.originCountry)
      ? show.originCountry
      : []
  const networkIds = Array.isArray(show.networks)
    ? show.networks.map((network) => Number(network?.id)).filter((n) => Number.isFinite(n))
    : Array.isArray(show.networkIds)
      ? show.networkIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : []

  return {
    tmdbId: id,
    name: show.name || show.original_name || show.title || 'Untitled show',
    originalName: show.original_name || show.originalName || '',
    originalLanguage: show.original_language || show.originalLanguage || '',
    overview: show.overview || '',
    posterPath,
    backdropPath,
    logoUrl: show.logoUrl || null,
    genreIds: Array.isArray(show.genre_ids)
      ? show.genre_ids.map((n) => Number(n)).filter((n) => Number.isFinite(n))
      : Array.isArray(show.genreIds)
        ? show.genreIds.map((n) => Number(n)).filter((n) => Number.isFinite(n))
        : Array.isArray(show.genres)
          ? show.genres.map((g) => Number(g?.id)).filter((n) => Number.isFinite(n))
          : [],
    originCountry: originalCountry.map((c) => String(c)).filter(Boolean),
    networkIds,
    firstAirDate: show.first_air_date || show.firstAirDate || '',
    popularity: Number(show.popularity) || 0,
    voteAverage: Number(show.vote_average ?? show.voteAverage) || 0,
    voteCount: Number(show.vote_count ?? show.voteCount) || 0,
    numberOfSeasons: Number.isFinite(Number(show.number_of_seasons ?? show.numberOfSeasons))
      ? Number(show.number_of_seasons ?? show.numberOfSeasons)
      : null,
    numberOfEpisodes: Number.isFinite(Number(show.number_of_episodes ?? show.numberOfEpisodes))
      ? Number(show.number_of_episodes ?? show.numberOfEpisodes)
      : null,
    status: show.status || '',
    type: show.type || '',
    cachedAt: new Date(),
    lastDiscoveredAt: new Date(),
  }
}

const toShowResponse = (show) => {
  const normalized = normalizeShow(show)
  if (!normalized) return null

  return {
    id: normalized.tmdbId,
    name: normalized.name,
    originalName: normalized.originalName || null,
    originalLanguage: normalized.originalLanguage || null,
    overview: normalized.overview || '',
    posterUrl: normalized.posterPath ? `${TMDB_IMG_BASE}${normalized.posterPath}` : null,
    backdropUrl: normalized.backdropPath ? `${TMDB_IMG_BACKDROP}${normalized.backdropPath}` : null,
    logoUrl: normalized.logoUrl || null,
    genreIds: normalized.genreIds,
    originCountry: normalized.originCountry,
    networkIds: normalized.networkIds,
    firstAirDate: normalized.firstAirDate || null,
    popularity: normalized.popularity,
    voteAverage: Number.isFinite(normalized.voteAverage) ? Number(normalized.voteAverage.toFixed(1)) : null,
    voteCount: normalized.voteCount,
    numberOfSeasons: Number.isFinite(normalized.numberOfSeasons) ? normalized.numberOfSeasons : null,
    numberOfEpisodes: Number.isFinite(normalized.numberOfEpisodes) ? normalized.numberOfEpisodes : null,
    status: normalized.status || null,
    type: normalized.type || null,
  }
}

const pickLogo = (images) => {
  const logos = images?.logos || []
  const logo = logos.find((item) => item.iso_639_1 === 'en') || logos.find((item) => !item.iso_639_1) || logos[0]
  return logo?.file_path ? `${TMDB_IMG_LOGO}${logo.file_path}` : null
}

const saveShowsToCache = async (shows, shelfKey = null) => {
  const rows = (Array.isArray(shows) ? shows : [])
    .map(normalizeShow)
    .filter(Boolean)

  if (!rows.length) return

  const ops = rows.map((show) => ({
    updateOne: {
      filter: { tmdbId: show.tmdbId },
      update: {
        $set: {
          tmdbId: show.tmdbId,
          name: show.name,
          originalName: show.originalName,
          originalLanguage: show.originalLanguage,
          overview: show.overview,
          posterPath: show.posterPath,
          backdropPath: show.backdropPath,
          genreIds: show.genreIds,
          originCountry: show.originCountry,
          networkIds: show.networkIds,
          firstAirDate: show.firstAirDate,
          popularity: show.popularity,
          voteAverage: show.voteAverage,
          voteCount: show.voteCount,
          numberOfSeasons: show.numberOfSeasons,
          numberOfEpisodes: show.numberOfEpisodes,
          status: show.status,
          type: show.type,
          lastDiscoveredAt: new Date(),
          cachedAt: new Date(),
        },
        ...(shelfKey ? { $addToSet: { shelfKeys: shelfKey } } : {}),
      },
      upsert: true,
    },
  }))

  await TVShowCache.bulkWrite(ops)
}

const buildDiscoverResponse = async ({
  query = {},
  page = 1,
  limit = 20,
  shelfKey = null,
}) => {
  const pageNumber = clampPage(page)
  const pageSize = clampLimit(limit, 20)
  const skip = (pageNumber - 1) * pageSize
  const dbFilter = buildTvDbFilter(query)
  const dbSort = buildTvDbSort(query)

  const totalCached = await TVShowCache.countDocuments(dbFilter)
  if (totalCached >= skip + pageSize) {
    const cached = await TVShowCache.find(dbFilter)
      .sort(dbSort)
      .skip(skip)
      .limit(pageSize)
      .lean()

    return {
      results: cached.map(toShowResponse).filter(Boolean),
      page: pageNumber,
      totalResults: totalCached,
      totalPages: Math.max(1, Math.ceil(totalCached / pageSize), pageNumber + 1),
      hasMore: true,
      source: 'db',
    }
  }

  let tmdbData = null
  try {
    tmdbData = await tmdbFetch('discover/tv', {
      ...query,
      page: pageNumber,
      language: 'en-US',
      include_adult: 'false',
    })
  } catch (error) {
    const cachedFallback = await TVShowCache.find(dbFilter)
      .sort(dbSort)
      .skip(skip)
      .limit(pageSize)
      .lean()

    if (cachedFallback.length) {
      return {
        results: cachedFallback.map(toShowResponse).filter(Boolean),
        page: pageNumber,
        totalResults: totalCached,
        totalPages: Math.max(1, Math.ceil(totalCached / pageSize), pageNumber),
        hasMore: false,
        source: 'db-fallback',
      }
    }

    return {
      results: [],
      page: pageNumber,
      totalResults: totalCached,
      totalPages: Math.max(1, Math.ceil(totalCached / pageSize), pageNumber),
      hasMore: false,
      source: 'empty-fallback',
    }
  }

  const results = (tmdbData.results || []).map(normalizeShow).filter(Boolean)
  await saveShowsToCache(results, shelfKey)

  return {
    results: results.map(toShowResponse).filter(Boolean),
    page: pageNumber,
    totalResults: tmdbData.total_results || results.length,
    totalPages: tmdbData.total_pages || Math.max(1, Math.ceil((tmdbData.total_results || results.length) / pageSize)),
    hasMore: pageNumber < Math.min(Number(tmdbData.total_pages) || 1, 500),
    source: 'tmdb',
  }
}

const getTrendingShows = async (limit = 10, page = 1) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20)
  const pageNumber = clampPage(page)
  let data = null
  try {
    data = await tmdbFetch('trending/tv/day', { language: 'en-US', page: pageNumber })
  } catch (error) {
    const cached = await TVShowCache.find({ shelfKeys: 'trending' })
      .sort({ popularity: -1, voteAverage: -1, voteCount: -1, firstAirDate: -1 })
      .limit(pageSize)
      .lean()

    return {
      results: cached.map(toShowResponse).filter(Boolean),
      totalResults: cached.length,
      totalPages: 1,
      hasMore: false,
      page: pageNumber,
      source: 'db-fallback',
      window: 'day',
      limit: pageSize,
    }
  }
  const picks = (data.results || [])
    .filter((show) => show?.id)
    .slice(0, pageSize)
    .map(normalizeShow)
    .filter(Boolean)

  const enrichedPicks = await Promise.all(
    picks.map(async (show) => {
      try {
        const detail = await tmdbFetch(`tv/${show.tmdbId}`, {
          language: 'en-US',
          append_to_response: 'images',
          include_image_language: 'en,null',
        })
        return {
          ...show,
          logoUrl: pickLogo(detail.images),
        }
      } catch {
        return { ...show, logoUrl: null }
      }
    }),
  )

  await saveShowsToCache(enrichedPicks, 'trending')

  return {
    results: enrichedPicks.map(toShowResponse).filter(Boolean),
    totalResults: data.total_results || picks.length,
    totalPages: data.total_pages || 1,
    hasMore: pageNumber < Math.min(Number(data.total_pages) || 1, 500),
    page: pageNumber,
    source: 'tmdb',
    window: 'day',
    limit: pageSize,
  }
}

const buildRelatedResponse = async ({ tvId, page = 1, limit = 20 }) => {
  const pageNumber = clampPage(page)
  const pageSize = clampLimit(limit, 20)
  const skip = (pageNumber - 1) * pageSize
  const shelfKey = `related-${tvId}`
  const dbFilter = { shelfKeys: shelfKey }
  const dbSort = { popularity: -1, voteAverage: -1, voteCount: -1, firstAirDate: -1 }

  const totalCached = await TVShowCache.countDocuments(dbFilter)
  if (totalCached >= skip + pageSize) {
    const cached = await TVShowCache.find(dbFilter)
      .sort(dbSort)
      .skip(skip)
      .limit(pageSize)
      .lean()

    return {
      results: cached.map(toShowResponse).filter(Boolean),
      page: pageNumber,
      totalResults: totalCached,
      totalPages: Math.max(1, Math.ceil(totalCached / pageSize), pageNumber + 1),
      hasMore: true,
      source: 'db',
    }
  }

  const data = await tmdbFetch(`tv/${tvId}/recommendations`, {
    language: 'en-US',
    page: pageNumber,
  })

  const results = (data.results || []).map(normalizeShow).filter(Boolean)
  await saveShowsToCache(results, shelfKey)

  return {
    results: results.map(toShowResponse).filter(Boolean),
    page: pageNumber,
    totalResults: data.total_results || results.length,
    totalPages: data.total_pages || Math.max(1, Math.ceil((data.total_results || results.length) / pageSize)),
    hasMore: pageNumber < Math.min(Number(data.total_pages) || 1, 500),
    source: 'tmdb',
  }
}

module.exports = {
  buildRelatedResponse,
  buildDiscoverResponse,
  buildTvDbFilter,
  buildTvDbSort,
  getTrendingShows,
  normalizeShow,
  saveShowsToCache,
  toShowResponse,
}
