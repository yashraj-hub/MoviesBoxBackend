const { tmdbFetch, saveToCache, TMDB_IMG_BASE, TMDB_IMG_BACKDROP } = require('./tmdb.service')
const { saveShowsToCache } = require('./tvDiscovery.service')
const { UNIVERSES } = require('../config/universes')
const { MARVEL_UNIVERSE } = require('../config/marvelUniverse')

const CACHE_TTL_MS = 20 * 60 * 1000
const universeCache = new Map()

const parseYear = (value) => {
  if (!value || String(value).length < 4) return null
  const year = Number.parseInt(String(value).slice(0, 4), 10)
  return Number.isFinite(year) ? year : null
}

const isAnimated = (item) => {
  if (!item) return false
  if (Array.isArray(item.genreIds) && item.genreIds.includes(16)) return true
  const text = `${item.title || ''} ${item.name || ''} ${item.overview || ''}`.toLowerCase()
  return /(animated|animation|cartoon|toon|anime)/i.test(text)
}

const normalizeMedia = (item, sourceLabel, universeKey) => {
  if (!item?.id || !item?.media_type) return null
  if (item.media_type !== 'movie' && item.media_type !== 'tv') return null

  const isMovie = item.media_type === 'movie'
  const title = isMovie ? (item.title || item.original_title || 'Untitled movie') : (item.name || item.original_name || 'Untitled show')
  const releaseDate = isMovie ? (item.release_date || null) : (item.first_air_date || null)
  const posterPath = item.poster_path ? `${TMDB_IMG_BASE}${item.poster_path}` : null
  const backdropPath = item.backdrop_path ? `${TMDB_IMG_BACKDROP}${item.backdrop_path}` : null
  const genreIds = Array.isArray(item.genre_ids) ? item.genre_ids.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : []
  const year = parseYear(releaseDate)

  return {
    id: item.id,
    tmdbId: item.id,
    mediaType: item.media_type,
    title,
    name: title,
    originalTitle: item.original_title || item.original_name || '',
    overview: item.overview || '',
    posterPath,
    backdropPath,
    releaseDate,
    firstAirDate: isMovie ? null : releaseDate,
    voteAverage: typeof item.vote_average === 'number' ? Number(item.vote_average.toFixed(1)) : null,
    voteCount: typeof item.vote_count === 'number' ? item.vote_count : null,
    popularity: Number(item.popularity) || 0,
    genreIds,
    year,
    universeKey,
    sourceLabels: [sourceLabel],
    isAnimated: isAnimated({ ...item, title }),
  }
}

const mergeMedia = (current, incoming) => {
  const sourceLabels = new Set([...(current.sourceLabels || []), ...(incoming.sourceLabels || [])])

  return {
    ...current,
    title: current.title || incoming.title,
    name: current.name || incoming.name,
    originalTitle: current.originalTitle || incoming.originalTitle,
    overview: current.overview || incoming.overview,
    posterPath: current.posterPath || incoming.posterPath,
    backdropPath: current.backdropPath || incoming.backdropPath,
    releaseDate: current.releaseDate || incoming.releaseDate,
    firstAirDate: current.firstAirDate || incoming.firstAirDate,
    voteAverage: current.voteAverage ?? incoming.voteAverage,
    voteCount: current.voteCount ?? incoming.voteCount,
    popularity: Math.max(current.popularity || 0, incoming.popularity || 0),
    genreIds: Array.from(new Set([...(current.genreIds || []), ...(incoming.genreIds || [])])),
    year: current.year || incoming.year,
    sourceLabels: Array.from(sourceLabels),
    isAnimated: current.isAnimated || incoming.isAnimated,
  }
}

const sortTimeline = (items) => [...items].sort((a, b) => {
  const ta = a.year ?? 0
  const tb = b.year ?? 0
  if (ta !== tb) return ta - tb

  const da = a.releaseDate || a.firstAirDate || ''
  const db = b.releaseDate || b.firstAirDate || ''
  if (da !== db) return String(da).localeCompare(String(db))

  return (b.voteAverage ?? 0) - (a.voteAverage ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0)
})

const fetchSearchMulti = async (query, pages = 1) => {
  const results = []

  for (let page = 1; page <= pages; page += 1) {
    const data = await tmdbFetch('search/multi', {
      query,
      page,
      include_adult: 'false',
      language: 'en-US',
    })

    const rows = Array.isArray(data?.results) ? data.results : []
    for (const row of rows) {
      if (row?.media_type !== 'movie' && row?.media_type !== 'tv') continue
      results.push(row)
    }
  }

  return results
}

const marvelResolveCache = new Map()

const normalizeTitle = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '')

const getResultType = (result, preferredType = null) => {
  if (preferredType) return preferredType
  if (result?.media_type === 'movie' || result?.media_type === 'tv') return result.media_type
  if (result?.first_air_date && !result?.release_date) return 'tv'
  return 'movie'
}

const getResultTitle = (result, preferredType = null) => {
  const type = getResultType(result, preferredType)
  return type === 'tv'
    ? (result?.name || result?.original_name || result?.title || result?.original_title || '')
    : (result?.title || result?.original_title || result?.name || result?.original_name || '')
}

const resolveSearchCandidate = (results, entry) => {
  const query = entry.query || entry.title
  const normalizedQuery = normalizeTitle(query)
  const normalizedTitle = normalizeTitle(entry.title)

  let best = null
  let bestScore = -Infinity

  for (const result of results || []) {
    if (!result) continue
    const type = getResultType(result, entry.mediaType)
    const candidateTitle = getResultTitle(result, type)
    const normalizedCandidate = normalizeTitle(candidateTitle)
    let score = 0

    if (normalizedCandidate && normalizedCandidate === normalizedTitle) score += 120
    else if (normalizedCandidate && normalizedQuery && normalizedCandidate.includes(normalizedQuery)) score += 90
    else if (normalizedCandidate && normalizedQuery && normalizedQuery.includes(normalizedCandidate)) score += 80
    else if (normalizedCandidate && normalizedTitle && normalizedCandidate.includes(normalizedTitle)) score += 70

    if (entry.mediaType && type === entry.mediaType) score += 35
    if (entry.featured) score += 5
    score += Math.min(15, Math.round((Number(result.popularity) || 0) / 20))

    if (score > bestScore) {
      best = { ...result, media_type: type }
      bestScore = score
    }
  }

  return best
}

const normalizeMarvelResolvedItem = (result, entry) => {
  if (!result) {
    return {
      tmdbId: null,
      title: entry.title,
      mediaType: entry.mediaType,
      posterPath: null,
      backdropPath: null,
      releaseDate: null,
      firstAirDate: null,
      voteAverage: null,
      voteCount: null,
      popularity: 0,
      year: null,
      unresolved: true,
    }
  }

  const isMovie = getResultType(result, entry.mediaType) === 'movie'
  const releaseDate = isMovie ? (result.release_date || null) : (result.first_air_date || null)
  const posterPath = result.poster_path ? `${TMDB_IMG_BASE}${result.poster_path}` : null
  const backdropPath = result.backdrop_path ? `${TMDB_IMG_BACKDROP}${result.backdrop_path}` : null
  const title = entry.title || getResultTitle(result, entry.mediaType)
  const year = parseYear(releaseDate)

  return {
    tmdbId: Number(result.id) || null,
    title,
    mediaType: isMovie ? 'movie' : 'tv',
    posterPath,
    backdropPath,
    releaseDate,
    firstAirDate: isMovie ? null : releaseDate,
    voteAverage: typeof result.vote_average === 'number' ? Number(result.vote_average.toFixed(1)) : null,
    voteCount: typeof result.vote_count === 'number' ? result.vote_count : null,
    popularity: Number(result.popularity) || 0,
    year,
    unresolved: false,
  }
}

const resolveMarvelEntry = async (entry) => {
  const cacheKey = `${entry.mediaType}|${entry.title}|${entry.query || ''}`
  const cached = marvelResolveCache.get(cacheKey)
  if (cached) return cached

  const query = entry.query || entry.title
  const paths = entry.mediaType === 'tv'
    ? ['search/tv', 'search/multi']
    : entry.mediaType === 'movie'
      ? ['search/movie', 'search/multi']
      : ['search/multi']

  let candidate = null
  for (const path of paths) {
    try {
      const data = await tmdbFetch(path, {
        query,
        page: 1,
        include_adult: 'false',
        language: 'en-US',
      })
      const results = Array.isArray(data?.results) ? data.results : []
      candidate = resolveSearchCandidate(results, entry)
      if (candidate) break
    } catch {
      // try next path
    }
  }

  const resolved = normalizeMarvelResolvedItem(candidate, entry)
  marvelResolveCache.set(cacheKey, resolved)
  return resolved
}

const flattenMarvelSections = async () => {
  const movieRows = []
  const tvRows = []

  const sections = []
  let globalItemOrder = 0

  for (const [sectionIndex, section] of MARVEL_UNIVERSE.sections.entries()) {
    const resolvedSection = {
      key: section.key,
      label: section.label,
      sectionIndex,
      groups: [],
    }

    for (const [groupIndex, group] of section.groups.entries()) {
      const resolvedItems = []

      for (const [itemIndex, entry] of group.items.entries()) {
        const resolved = await resolveMarvelEntry(entry)
        const heroTags = Array.isArray(entry.heroTags) ? entry.heroTags : []
        const year = resolved.year ?? parseYear(resolved.releaseDate)
        const isAnimated = heroTags.some((tag) => ['anime', 'animated', 'spider-verse', 'cartoons'].includes(tag))
        const resolvedItem = {
          entryId: `${section.key}:${group.key}:${itemIndex}:${resolved.title}`,
          id: resolved.tmdbId,
          tmdbId: resolved.tmdbId,
          title: entry.title,
          mediaType: entry.mediaType,
          posterPath: resolved.posterPath,
          backdropPath: resolved.backdropPath,
          releaseDate: resolved.releaseDate,
          firstAirDate: resolved.firstAirDate,
          voteAverage: resolved.voteAverage,
          voteCount: resolved.voteCount,
          popularity: resolved.popularity,
          heroTags,
          featured: Boolean(entry.featured),
          unresolved: resolved.unresolved,
          isAnimated,
          query: entry.query || entry.title,
          orderIndex: globalItemOrder,
          year,
        }

        globalItemOrder += 1
        resolvedItems.push(resolvedItem)

        if (resolvedItem.mediaType === 'movie' && resolvedItem.posterPath && typeof resolvedItem.tmdbId === 'number') {
          movieRows.push({
            id: resolvedItem.tmdbId,
            media_type: 'movie',
            title: resolvedItem.title,
            original_title: resolvedItem.title,
            overview: '',
            poster_path: resolvedItem.posterPath.replace(TMDB_IMG_BASE, ''),
            backdrop_path: resolvedItem.backdropPath ? resolvedItem.backdropPath.replace(TMDB_IMG_BACKDROP, '') : '',
            release_date: resolvedItem.releaseDate,
            vote_average: resolvedItem.voteAverage ?? 0,
            vote_count: resolvedItem.voteCount ?? 0,
            genre_ids: [],
          })
        }

        if (resolvedItem.mediaType === 'tv' && resolvedItem.posterPath && typeof resolvedItem.tmdbId === 'number') {
          tvRows.push({
            id: resolvedItem.tmdbId,
            name: resolvedItem.title,
            original_name: resolvedItem.title,
            overview: '',
            poster_path: resolvedItem.posterPath.replace(TMDB_IMG_BASE, ''),
            backdrop_path: resolvedItem.backdropPath ? resolvedItem.backdropPath.replace(TMDB_IMG_BACKDROP, '') : '',
            first_air_date: resolvedItem.releaseDate,
            vote_average: resolvedItem.voteAverage ?? 0,
            vote_count: resolvedItem.voteCount ?? 0,
            genre_ids: [],
            media_type: 'tv',
          })
        }
      }

      resolvedSection.groups.push({
        key: group.key,
        label: group.label,
        groupIndex,
        items: resolvedItems,
        count: resolvedItems.length,
      })
    }

    sections.push(resolvedSection)
  }

  await saveToCache(movieRows, null).catch(() => {})
  await saveShowsToCache(tvRows, 'marvel').catch(() => {})

  const allItems = sections.flatMap((section) => section.groups.flatMap((group) => group.items))

  const heroLanes = MARVEL_UNIVERSE.heroLanes.map((lane) => {
    const matched = lane.key === 'all'
      ? allItems
      : allItems.filter((item) => Array.isArray(item.heroTags) && item.heroTags.includes(lane.key))

    const coverItem = matched.find((item) => item.posterPath) || matched[0] || null

    return {
      key: lane.key,
      label: lane.label,
      query: lane.query,
      count: matched.length,
      cover: coverItem?.posterPath || null,
      featured: Boolean(lane.anchor),
    }
  })

  const stats = {
    total: allItems.length,
    movies: allItems.filter((item) => item.mediaType === 'movie').length,
    tv: allItems.filter((item) => item.mediaType === 'tv').length,
    animated: allItems.filter((item) => Array.isArray(item.heroTags) && item.heroTags.some((tag) => ['anime', 'animated', 'spider-verse', 'cartoons'].includes(tag))).length,
    liveAction: allItems.filter((item) => !(Array.isArray(item.heroTags) && item.heroTags.some((tag) => ['anime', 'animated', 'spider-verse', 'cartoons'].includes(tag)))).length,
    classic: allItems.filter((item) => (item.year || 9999) < 2000).length,
  }

  return {
    universe: {
      key: MARVEL_UNIVERSE.key,
      label: MARVEL_UNIVERSE.label,
      title: MARVEL_UNIVERSE.title,
      tagline: MARVEL_UNIVERSE.tagline,
      accent: MARVEL_UNIVERSE.accent,
      phaseLabel: MARVEL_UNIVERSE.phaseLabel,
      heroQuery: 'Marvel',
    },
    heroLanes,
    sections,
    stats,
    sourceSummaries: [],
    items: allItems,
  }
}

const getUniverseConfig = (universeKey) => {
  const key = String(universeKey || '').trim().toLowerCase()
  return UNIVERSES[key] || null
}

const buildUniversePayload = async (universeKey) => {
  const config = getUniverseConfig(universeKey)
  if (!config) {
    const err = new Error('Invalid universe')
    err.status = 400
    throw err
  }

  const cacheKey = config.key
  const cached = universeCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.payload, source: 'cache' }
  }

  if (config.key === 'marvel') {
    const payload = await flattenMarvelSections()
    universeCache.set(cacheKey, { cachedAt: Date.now(), payload })
    return payload
  }

  const collected = new Map()
  const sourceSummaries = []

  await Promise.allSettled(
    config.sources.map(async (source) => {
      const rows = await fetchSearchMulti(source.query, source.pages || 1)
      sourceSummaries.push({
        key: source.key,
        label: source.label,
        query: source.query,
        results: rows.length,
      })

      const normalized = rows
        .map((row) => normalizeMedia(row, source.label, config.key))
        .filter(Boolean)

      for (const item of normalized) {
        const itemKey = `${item.mediaType}:${item.id}`
        const existing = collected.get(itemKey)
        if (existing) {
          collected.set(itemKey, mergeMedia(existing, item))
        } else {
          collected.set(itemKey, item)
        }
      }
    }),
  )

  const allItems = sortTimeline(Array.from(collected.values()))

  const movieItems = allItems.filter((item) => item.mediaType === 'movie')
  const tvItems = allItems.filter((item) => item.mediaType === 'tv')
  const animatedItems = allItems.filter((item) => item.isAnimated)
  const liveActionItems = allItems.filter((item) => !item.isAnimated)

  const timeline = config.timeline
    .map((phase) => {
      const items = allItems.filter((item) => {
        if (!item.year) return false
        return item.year >= phase.from && item.year <= phase.to
      })

      return {
        ...phase,
        items: sortTimeline(items).slice(0, 20),
        count: items.length,
      }
    })
    .filter((phase) => phase.items.length > 0)

  const collections = config.sources
    .map((source) => {
      const items = sortTimeline(
        allItems.filter((item) => Array.isArray(item.sourceLabels) && item.sourceLabels.includes(source.label)),
      )
      return {
        key: source.key,
        label: source.label,
        query: source.query,
        items: items.slice(0, 18),
        count: items.length,
      }
    })
    .filter((collection) => collection.items.length > 1)

  const stats = {
    total: allItems.length,
    movies: movieItems.length,
    tv: tvItems.length,
    animated: animatedItems.length,
    liveAction: liveActionItems.length,
    classic: allItems.filter((item) => (item.year ?? 0) < 2000).length,
  }

  const payload = {
    universe: {
      key: config.key,
      label: config.label,
      title: config.title,
      tagline: config.tagline,
      accent: config.accent,
      phaseLabel: config.phaseLabel,
      heroQuery: config.heroQuery,
    },
    stats,
    timeline,
    collections,
    items: allItems,
    sourceSummaries,
  }

  universeCache.set(cacheKey, {
    cachedAt: Date.now(),
    payload,
  })

  if (movieItems.length) {
    const movieRows = movieItems.map((item) => ({
      id: item.id,
      media_type: 'movie',
      title: item.title,
      original_title: item.originalTitle,
      overview: item.overview,
      poster_path: item.posterPath ? item.posterPath.replace(TMDB_IMG_BASE, '') : '',
      backdrop_path: item.backdropPath ? item.backdropPath.replace(TMDB_IMG_BACKDROP, '') : '',
      release_date: item.releaseDate,
      vote_average: item.voteAverage ?? 0,
      vote_count: item.voteCount ?? 0,
      genre_ids: item.genreIds || [],
    }))
    saveToCache(movieRows, null).catch(() => {})
  }

  if (tvItems.length) {
    const tvRows = tvItems.map((item) => ({
      id: item.id,
      name: item.title,
      original_name: item.originalTitle,
      overview: item.overview,
      poster_path: item.posterPath ? item.posterPath.replace(TMDB_IMG_BASE, '') : '',
      backdrop_path: item.backdropPath ? item.backdropPath.replace(TMDB_IMG_BACKDROP, '') : '',
      first_air_date: item.releaseDate,
      vote_average: item.voteAverage ?? 0,
      vote_count: item.voteCount ?? 0,
      genre_ids: item.genreIds || [],
      media_type: 'tv',
    }))
    saveShowsToCache(tvRows, config.key).catch(() => {})
  }

  return payload
}

const listUniverses = () =>
  Object.values(UNIVERSES).map((universe) => ({
    key: universe.key,
    label: universe.label,
    title: universe.title,
    tagline: universe.tagline,
    accent: universe.accent,
    phaseLabel: universe.phaseLabel,
    heroQuery: universe.heroQuery,
    timeline: universe.timeline,
    sources: universe.sources.map((source) => ({
      key: source.key,
      label: source.label,
      query: source.query,
    })),
  }))

module.exports = {
  buildUniversePayload,
  listUniverses,
  getUniverseConfig,
}
