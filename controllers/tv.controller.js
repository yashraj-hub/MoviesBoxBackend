const { tmdbFetch, TMDB_IMG_BASE, TMDB_IMG_BACKDROP, TMDB_IMG_LOGO } = require('../services/tmdb.service')
const { TV_GENRES } = require('../config/tvGenres')
const { TV_SHELVES } = require('../config/tvShelves')
const {
  buildDiscoverResponse,
  buildRelatedResponse,
  getTrendingShows,
  saveShowsToCache,
  toShowResponse,
  normalizeShow,
} = require('../services/tvDiscovery.service')

const TMDB_IMG_STILL = 'https://image.tmdb.org/t/p/w780'

const pickLogo = (images) => {
  const logos = images?.logos || []
  const logo = logos.find((item) => item.iso_639_1 === 'en') || logos[0]
  return logo?.file_path ? `${TMDB_IMG_LOGO}${logo.file_path}` : null
}

const formatEpisode = (episode) => ({
  episodeNumber: episode.episode_number ?? null,
  name: episode.name || 'Untitled episode',
  overview: episode.overview || '',
  airDate: episode.air_date || null,
  runtime: episode.runtime ?? null,
  stillUrl: episode.still_path ? `${TMDB_IMG_STILL}${episode.still_path}` : null,
})

const formatSeasonMeta = (season) => ({
  seasonNumber: season.season_number ?? null,
  name: season.name || `Season ${season.season_number ?? ''}`.trim(),
  airDate: season.air_date || null,
  episodeCount: season.episode_count ?? null,
  posterUrl: season.poster_path ? `${TMDB_IMG_BASE}${season.poster_path}` : null,
})

const pickLatestSeason = (seasons = []) =>
  [...seasons]
    .filter((season) => Number.isInteger(season?.season_number) && season.season_number > 0)
    .sort((a, b) => b.season_number - a.season_number)[0] || null

const getTvDetail = async (id) => {
  const [detail, externalIds] = await Promise.all([
    tmdbFetch(`tv/${id}`, {
      language: 'en-US',
      append_to_response: 'external_ids,images',
      include_image_language: 'en,null',
    }),
    tmdbFetch(`tv/${id}/external_ids`, { language: 'en-US' }).catch(() => ({})),
  ])

  return {
    ...detail,
    external_ids: detail.external_ids || externalIds || {},
  }
}

const formatShow = async (show) => {
  const detail = await getTvDetail(show.id)
  const latestSeasonMeta = pickLatestSeason(detail.seasons || [])

  let latestSeason = null
  if (latestSeasonMeta) {
    const season = await tmdbFetch(`tv/${show.id}/season/${latestSeasonMeta.season_number}`, {
      language: 'en-US',
    }).catch(() => null)

    if (season) {
      latestSeason = {
        seasonNumber: season.season_number ?? latestSeasonMeta.season_number,
        name: season.name || latestSeasonMeta.name || `Season ${latestSeasonMeta.season_number}`,
        airDate: season.air_date || latestSeasonMeta.air_date || null,
        episodes: Array.isArray(season.episodes) ? season.episodes.map(formatEpisode) : [],
      }
    }
  }

  return {
    id: detail.id,
    imdbId: detail.external_ids?.imdb_id || null,
    name: detail.name || detail.original_name || show.name || 'Untitled show',
    overview: detail.overview || show.overview || '',
    firstAirDate: detail.first_air_date || show.first_air_date || null,
    voteAverage: typeof detail.vote_average === 'number' ? Number(detail.vote_average.toFixed(1)) : null,
    posterUrl: detail.poster_path ? `${TMDB_IMG_BASE}${detail.poster_path}` : null,
    backdropUrl: detail.backdrop_path ? `${TMDB_IMG_BACKDROP}${detail.backdrop_path}` : null,
    logoUrl: pickLogo(detail.images),
    seasonsCount: detail.number_of_seasons || (Array.isArray(detail.seasons) ? detail.seasons.length : null),
    episodesCount: detail.number_of_episodes || null,
    seasons: (Array.isArray(detail.seasons) ? detail.seasons : [])
      .filter((season) => Number.isInteger(season?.season_number) && season.season_number > 0)
      .map(formatSeasonMeta),
    latestSeason,
  }
}

exports.getTVGenres = async (_req, res) => {
  res.json({ genres: TV_GENRES })
}

exports.getTVShelf = async (req, res, next) => {
  try {
    const shelfKey = String(req.params.shelf || '').trim()
    const shelf = TV_SHELVES[shelfKey]

    if (!shelf) {
      return res.status(400).json({ message: 'Invalid TV shelf' })
    }

    if (shelf.type === 'trending') {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1)
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 40)
      const data = await getTrendingShows(limit, page)
      return res.json({
        shelf: { key: shelfKey, label: shelf.label },
        ...data,
      })
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 40)
    const data = await buildDiscoverResponse({
      query: shelf.query,
      page,
      limit,
      shelfKey,
    })

    return res.json({
      shelf: { key: shelfKey, label: shelf.label },
      ...data,
    })
  } catch (err) {
    next(err)
  }
}

exports.getTVGenreShows = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.genreId, 10)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 40)
    const zone = String(req.query.zone || '').trim().toLowerCase()

    if (!genreId) return res.status(400).json({ message: 'Invalid TV genre ID' })

    const tmdbQuery = {
      with_genres: String(genreId),
      sort_by: 'popularity.desc',
    }

    if (zone === 'hindi') {
      tmdbQuery.with_original_language = 'hi'
    } else if (zone === 'animation') {
      tmdbQuery.with_genres = '16'
    } else if (zone === 'english') {
      tmdbQuery.with_original_language = 'en'
    }

    const data = await buildDiscoverResponse({
      query: tmdbQuery,
      page,
      limit,
      shelfKey: `genre-${genreId}`,
    })

    res.json({
      genreId,
      zone: zone || null,
      ...data,
    })
  } catch (err) {
    next(err)
  }
}

exports.getTVRelatedShows = async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId, 10)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 40)

    if (!id) return res.status(400).json({ message: 'Invalid TV show ID' })

    const data = await buildRelatedResponse({
      tvId: id,
      page,
      limit,
    })

    res.json({
      tvId: id,
      ...data,
    })
  } catch (err) {
    next(err)
  }
}

exports.getTrendingTVShows = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 20)
    const data = await getTrendingShows(limit, 1)
    res.json({
      ...data,
      source: data.source || 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}

exports.getTVDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId, 10)
    if (!id) return res.status(400).json({ message: 'Invalid TV show ID' })

    const detail = await getTvDetail(id)
    await saveShowsToCache([detail], 'detail').catch(() => {})

    const normalized = normalizeShow({
      id: detail.id,
      name: detail.name,
      original_name: detail.original_name,
      original_language: detail.original_language,
      overview: detail.overview,
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      genre_ids: Array.isArray(detail.genres) ? detail.genres.map((g) => g.id) : [],
      origin_country: detail.origin_country,
      first_air_date: detail.first_air_date,
      popularity: detail.popularity,
      vote_average: detail.vote_average,
      vote_count: detail.vote_count,
      number_of_seasons: detail.number_of_seasons,
      number_of_episodes: detail.number_of_episodes,
      status: detail.status,
      type: detail.type,
    })

    res.json({
      id: detail.id,
      imdbId: detail.external_ids?.imdb_id || null,
      name: detail.name || detail.original_name || 'Untitled show',
      overview: detail.overview || '',
      firstAirDate: detail.first_air_date || null,
      voteAverage: typeof detail.vote_average === 'number' ? Number(detail.vote_average.toFixed(1)) : null,
      posterUrl: detail.poster_path ? `${TMDB_IMG_BASE}${detail.poster_path}` : null,
      backdropUrl: detail.backdrop_path ? `${TMDB_IMG_BACKDROP}${detail.backdrop_path}` : null,
      logoUrl: pickLogo(detail.images),
      seasonsCount: detail.number_of_seasons || (Array.isArray(detail.seasons) ? detail.seasons.length : null),
      episodesCount: detail.number_of_episodes || null,
      genres: Array.isArray(detail.genres)
        ? detail.genres.map((genre) => ({ id: genre.id, name: genre.name }))
        : [],
      originalLanguage: detail.original_language || null,
      originCountry: Array.isArray(detail.origin_country) ? detail.origin_country : [],
      status: detail.status || null,
      type: detail.type || null,
      source: 'tmdb',
      cacheSnapshot: toShowResponse(normalized),
      seasons: (Array.isArray(detail.seasons) ? detail.seasons : [])
        .filter((season) => Number.isInteger(season?.season_number) && season.season_number > 0)
        .map(formatSeasonMeta),
    })
  } catch (err) {
    next(err)
  }
}

exports.getTVSeason = async (req, res, next) => {
  try {
    const id = parseInt(req.params.tmdbId, 10)
    const seasonNumber = parseInt(req.params.seasonNumber, 10)

    if (!id) return res.status(400).json({ message: 'Invalid TV show ID' })
    if (!seasonNumber || seasonNumber < 1) {
      return res.status(400).json({ message: 'Invalid season number' })
    }

    const season = await tmdbFetch(`tv/${id}/season/${seasonNumber}`, { language: 'en-US' })

    res.json({
      tvId: id,
      seasonNumber: season.season_number ?? seasonNumber,
      name: season.name || `Season ${seasonNumber}`,
      airDate: season.air_date || null,
      overview: season.overview || '',
      episodes: Array.isArray(season.episodes) ? season.episodes.map(formatEpisode) : [],
      source: 'tmdb',
    })
  } catch (err) {
    next(err)
  }
}
