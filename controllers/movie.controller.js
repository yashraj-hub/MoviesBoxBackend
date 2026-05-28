const MovieCache = require('../models/MovieCache');
const TVShowCache = require('../models/TVShowCache');
const User = require('../models/User');
const DailyWatchStat = require('../models/DailyWatchStat');
const HiddenContinueWatching = require('../models/HiddenContinueWatching');
const mongoose = require('mongoose');
const { tmdbFetch, syncIfNeeded, saveToCache, TMDB_IMG_BASE, TMDB_IMG_BACKDROP } = require('../services/tmdb.service');
const { saveShowsToCache, toShowResponse } = require('../services/tvDiscovery.service');
const { trackEvent } = require('../services/activity.service');

const AUTH_BG_CACHE_TTL_MS = 15 * 60 * 1000;
const AUTH_BG_STALE_MS = 6 * 60 * 60 * 1000;
let authBackgroundCache = { results: [], fetchedAt: 0 };
let authBackgroundRefresh = null;

const withTimeout = (promise, ms, fallback) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve(fallback), ms);
  Promise.resolve(promise)
    .then((value) => resolve(value))
    .catch(() => resolve(fallback))
    .finally(() => clearTimeout(timer));
});

const formatAuthBackgrounds = (movies) => {
  const seen = new Set();
  const results = [];

  for (const movie of movies || []) {
    const rawBackdrop = movie?.backdropPath || movie?.backdrop_path;
    if (!rawBackdrop) continue;

    const id = movie.tmdbId || movie.id || rawBackdrop;
    if (seen.has(id)) continue;
    seen.add(id);

    results.push({
      id,
      title: movie.title || movie.name || 'MoviesBox',
      backdrop_path: rawBackdrop.startsWith('http') ? rawBackdrop : `${TMDB_IMG_BACKDROP}${rawBackdrop}`,
    });
  }

  return results.slice(0, 10);
};

const loadAuthBackgrounds = async () => {
  let movies = [];

  if (mongoose.connection.readyState === 1) {
    movies = await withTimeout(
      MovieCache.aggregate([
        { $match: { backdropPath: { $ne: null, $exists: true }, voteAverage: { $gte: 7 } } },
        { $sample: { size: 10 } },
      ]).option({ maxTimeMS: 1500 }),
      1800,
      [],
    );
  }

  if (movies.length < 3) {
    const data = await withTimeout(tmdbFetch('trending/movie/day'), 2500, null);
    const tmdbMovies = (data?.results || [])
      .filter((movie) => movie.backdrop_path)
      .slice(0, 10)
      .map((movie) => ({
        tmdbId: movie.id,
        title: movie.title,
        backdropPath: movie.backdrop_path,
      }));

    const seen = new Set(movies.map((movie) => movie.tmdbId || movie.id).filter(Boolean));
    for (const movie of tmdbMovies) {
      if (seen.has(movie.tmdbId)) continue;
      seen.add(movie.tmdbId);
      movies.push(movie);
    }
  }

  return formatAuthBackgrounds(movies);
};

const refreshAuthBackgroundCache = () => {
  if (authBackgroundRefresh) return authBackgroundRefresh;

  authBackgroundRefresh = loadAuthBackgrounds()
    .then((results) => {
      if (results.length) {
        authBackgroundCache = { results, fetchedAt: Date.now() };
      }
      return authBackgroundCache.results;
    })
    .finally(() => {
      authBackgroundRefresh = null;
    });

  return authBackgroundRefresh;
};

const toMovieResponse = (m) => ({
  tmdbId: m.tmdbId,
  title: m.title,
  overview: m.overview,
  posterPath: m.posterPath ? `${TMDB_IMG_BASE}${m.posterPath}` : null,
  backdropPath: m.backdropPath ? `${TMDB_IMG_BACKDROP}${m.backdropPath}` : null,
  releaseDate: m.releaseDate,
  voteAverage: m.voteAverage,
  category: m.category,
});

exports.browseByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const validCategories = ['bollywood', 'hollywood', 'animation'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Sync from TMDB if data is old (6-hour logic in service)
    await syncIfNeeded(category);

    const query = { category, $or: [{ redFlagged: { $ne: true } }, { streamUrl: { $exists: true, $ne: '' } }] };
    const [movies, total] = await Promise.all([
      MovieCache.find(query).sort({ voteAverage: -1 }).skip(skip).limit(limit).lean(),
      MovieCache.countDocuments(query),
    ]);

    if (req.authUser?.trackingEnabled !== false) {
      await trackEvent(req.user.sub, 'BROWSE', { category, page });
    }

    res.json({
      results: movies.map(toMovieResponse),
      page,
      totalResults: total,
      totalPages: Math.ceil(total / limit),
      source: 'db',
    });
  } catch (error) {
    next(error);
  }
};

exports.browseByGenre = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.genreId)
    const zone = req.query.zone || 'hollywood'
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = 40
    const skip = (page - 1) * limit

    if (!genreId) return res.status(400).json({ message: 'Invalid genre ID' })

    const filter = { genreIds: genreId }
    
    // Apply zone filter
    if (zone === 'bollywood') filter.originalLanguage = 'hi'
    else if (zone === 'hollywood') {
      filter.originalLanguage = 'en'
      filter.genreIds = { $in: [genreId], $nin: [16] } // exclude animation
    }
    else if (zone === 'animation') filter.genreIds = { $in: [genreId, 16] } // must have animation genre

    const [movies, total] = await Promise.all([
      MovieCache.find(filter).sort({ voteAverage: -1, popularity: -1 }).skip(skip).limit(limit).lean(),
      MovieCache.countDocuments(filter),
    ])

    if (movies.length > 0) {
      return res.json({
        results: movies.map(toMovieResponse),
        page,
        totalPages: Math.ceil(total / limit),
        totalResults: total,
        source: 'db',
      })
    }

    // TMDB fallback
    const tmdbQuery = { with_genres: genreId, sort_by: 'popularity.desc', language: 'en-US', page }
    if (zone === 'bollywood') tmdbQuery.with_original_language = 'hi'
    else if (zone === 'hollywood') {
      tmdbQuery.with_original_language = 'en'
      tmdbQuery.without_genres = '16'
    }
    else if (zone === 'animation') tmdbQuery.with_genres = '16'

    const data = await tmdbFetch('discover/movie', tmdbQuery)
    res.json({
      results: (data.results || []).map(m => ({
        tmdbId: m.id,
        title: m.title,
        posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
        backdropPath: m.backdrop_path ? `${TMDB_IMG_BASE}${m.backdrop_path}` : null,
        releaseDate: m.release_date,
        voteAverage: m.vote_average,
      })),
      page,
      totalPages: data.total_pages || 1,
      totalResults: data.total_results || 0,
      source: 'tmdb',
    })
  } catch (error) {
    next(error)
  }
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Release date ↑ = franchise timeline; missing dates last; tie-break popularity / rating */
const sortSearchResultsTimeline = (movies) => {
  const releaseTs = (m) => {
    const d = m.releaseDate;
    if (!d || String(d).length < 4) return null;
    const t = Date.parse(d);
    return Number.isFinite(t) ? t : null;
  };
  return [...movies].sort((a, b) => {
    const ta = releaseTs(a);
    const tb = releaseTs(b);
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    if (ta == null && tb == null) return (b.popularity ?? 0) - (a.popularity ?? 0);
    if (ta == null) return 1;
    if (tb == null) return -1;
    return (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
  });
};

const sortSearchTvResults = (shows) => {
  const firstAirTs = (show) => {
    const d = show.firstAirDate;
    if (!d || String(d).length < 4) return null;
    const t = Date.parse(d);
    return Number.isFinite(t) ? t : null;
  };

  return [...shows].sort((a, b) => {
    const ta = firstAirTs(a);
    const tb = firstAirTs(b);
    if (ta != null && tb != null && ta !== tb) return tb - ta;
    if (ta == null && tb == null) return (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
    if (ta == null) return 1;
    if (tb == null) return -1;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
};

/**
 * Attach collectionId / collectionName using MovieCache first, then TMDB movie/{id} (batched).
 */
const enrichSearchMoviesWithCollection = async (movies) => {
  const ids = [...new Set(movies.map((m) => m.tmdbId).filter((id) => id != null))];
  if (!ids.length) return movies.map((m) => ({ ...m, mediaType: 'movie' }));

  const fromDb = await MovieCache.find({ tmdbId: { $in: ids } })
    .select('tmdbId collectionId collectionName')
    .lean();
  const dbMap = new Map(fromDb.map((r) => [r.tmdbId, r]));

  const needDetail = ids.filter((id) => !dbMap.get(id)?.collectionId);
  const fetched = new Map();
  const detailBodies = [];
  const chunkSize = 5;
  for (let i = 0; i < needDetail.length; i += chunkSize) {
    const chunk = needDetail.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const detail = await tmdbFetch(`movie/${id}`);
          detailBodies.push(detail);
          const btc = detail.belongs_to_collection;
          fetched.set(
            id,
            btc
              ? { collectionId: btc.id, collectionName: btc.name }
              : { collectionId: null, collectionName: null },
          );
        } catch {
          fetched.set(id, { collectionId: null, collectionName: null });
        }
      }),
    );
  }

  if (detailBodies.length) {
    await saveToCache(detailBodies, null).catch(() => {});
  }

  return movies.map((m) => {
    const row = dbMap.get(m.tmdbId);
    const ext = fetched.get(m.tmdbId);
    const collectionId = row?.collectionId ?? ext?.collectionId ?? null;
    const collectionName = row?.collectionName ?? ext?.collectionName ?? null;
    return { ...m, collectionId, collectionName, mediaType: 'movie' };
  });
};

const releaseTsForSort = (m) => {
  if (!m) return 0;
  const d = m.releaseDate;
  if (!d || String(d).length < 4) return 0;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
};

/**
 * Same-collection hits (>=2) become rails; rest → otherResults. Part # = chronological in group.
 */
const buildCollectionSearchPayload = async (enriched) => {
  const byColl = new Map();
  for (const m of enriched) {
    const cid = m.collectionId;
    if (cid == null) continue;
    if (!byColl.has(cid)) byColl.set(cid, []);
    byColl.get(cid).push(m);
  }

  const inCollectionRail = new Set();
  const collectionGroups = [];

  for (const [collectionId, arr] of byColl) {
    if (arr.length < 2) continue;
    const sorted = sortSearchResultsTimeline(arr);
    const movies = sorted.map((m, idx) => ({
      ...m,
      partNumber: idx + 1,
    }));
    const name = sorted[0]?.collectionName || 'Collection';
    collectionGroups.push({
      collectionId,
      name,
      franchiseTotalParts: null,
      movies,
    });
    for (const m of sorted) {
      if (m.tmdbId != null) inCollectionRail.add(m.tmdbId);
    }
  }

  collectionGroups.sort((a, b) => {
    const ta = releaseTsForSort(a.movies[0]);
    const tb = releaseTsForSort(b.movies[0]);
    if (ta !== tb) return ta - tb;
    return (a.name || '').localeCompare(b.name || '');
  });

  await Promise.all(
    collectionGroups.map(async (g) => {
      try {
        const c = await tmdbFetch(`collection/${g.collectionId}`);
        if (c?.name) g.name = c.name;
        g.franchiseTotalParts = Array.isArray(c?.parts) ? c.parts.length : null;
      } catch {
        g.franchiseTotalParts = null;
      }
    }),
  );

  const otherResults = sortSearchResultsTimeline(
    enriched.filter((m) => m.tmdbId == null || !inCollectionRail.has(m.tmdbId)),
  );

  return { collectionGroups, otherResults };
};

const searchTvShows = async (q) => {
  let dbRaw = [];
  try {
    dbRaw = await TVShowCache.find({
      $text: { $search: q },
    })
      .sort({ voteAverage: -1, popularity: -1 })
      .limit(30)
      .lean();
  } catch (err) {
    console.warn('[search] tv $text query failed, falling back to regex only:', err.message);
  }

  if (dbRaw.length === 0) {
    const rx = new RegExp(escapeRegex(q), 'i');
    dbRaw = await TVShowCache.find({
      $or: [{ name: rx }, { originalName: rx }],
    })
      .sort({ voteAverage: -1, popularity: -1 })
      .limit(30)
      .lean();
  }

  let tmdbData = { results: [], total_results: 0, total_pages: 1 };
  try {
    tmdbData = await tmdbFetch('search/tv', {
      query: q,
      page: 1,
      include_adult: false,
      language: 'en-US',
    });
  } catch (err) {
    console.warn('[search] TV TMDB search failed:', err.message);
  }

  const tmdbMapped = (tmdbData.results || []).map((show) => ({
    ...toShowResponse(show),
    mediaType: 'tv',
  })).filter(Boolean);

  if (tmdbData.results?.length) {
    await saveShowsToCache(tmdbData.results, null).catch(() => {});
  }

  const seen = new Set();
  const merged = [];

  for (const raw of dbRaw) {
    const show = { ...toShowResponse(raw), mediaType: 'tv' };
    if (!show?.id || seen.has(show.id)) continue;
    seen.add(show.id);
    merged.push(show);
  }

  for (const show of tmdbMapped) {
    if (!show?.id || seen.has(show.id)) continue;
    seen.add(show.id);
    merged.push(show);
  }

  const results = sortSearchTvResults(merged).slice(0, 20);
  const hadDb = dbRaw.length > 0;
  const hadTmdb = tmdbMapped.length > 0;
  const source =
    hadDb && hadTmdb ? 'db+tmdb' : hadDb ? 'db' : hadTmdb ? 'tmdb' : 'none';

  return {
    results,
    source,
    totalResults: tmdbData.total_results || results.length,
    totalPages: tmdbData.total_pages || 1,
  };
};

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }
    if (q.length > 120) {
      return res.status(400).json({ message: 'Query is too long' });
    }

    // 1) DB — $text (requires text index). On failure or empty, regex on title / originalTitle.
    let dbRaw = [];
    try {
      dbRaw = await MovieCache.find({ $text: { $search: q }, $or: [{ redFlagged: { $ne: true } }, { streamUrl: { $exists: true, $ne: '' } }] })
        .sort({ voteAverage: -1, popularity: -1 })
        .limit(30)
        .lean();
    } catch (err) {
      console.warn('[search] $text query failed, falling back to regex only:', err.message);
    }

    if (dbRaw.length === 0) {
      const rx = new RegExp(escapeRegex(q), 'i');
      dbRaw = await MovieCache.find({
        $and: [
          { $or: [{ title: rx }, { originalTitle: rx }] },
          { $or: [{ redFlagged: { $ne: true } }, { streamUrl: { $exists: true, $ne: '' } }] },
        ],
      })
        .sort({ voteAverage: -1, popularity: -1 })
        .limit(30)
        .lean();
    }

    // 2) TMDB — always run so uncached / missed-text movies still show up
    let tmdbData = { results: [], total_results: 0, total_pages: 1 };
    try {
      tmdbData = await tmdbFetch('search/movie', {
        query: q,
        page: 1,
        include_adult: false,
        language: 'en-US',
      });
    } catch (err) {
      console.warn('[search] TMDB search failed:', err.message);
    }

    const tmdbMapped = (tmdbData.results || []).map((m) => ({
      tmdbId: m.id,
      title: m.title,
      overview: m.overview,
      posterPath: m.poster_path ? `${TMDB_IMG_BASE}${m.poster_path}` : null,
      backdropPath: m.backdrop_path ? `${TMDB_IMG_BACKDROP}${m.backdrop_path}` : null,
      releaseDate: m.release_date,
      voteAverage: m.vote_average,
      popularity: m.popularity ?? 0,
      category: undefined,
    }));

    const tvSearch = await searchTvShows(q);

    // 3) Merge: DB matches first (dedupe), then TMDB — user never loses a TMDB hit
    const seen = new Set();
    const merged = [];
    for (const raw of dbRaw) {
      const m = toMovieResponse(raw);
      if (m.tmdbId == null || seen.has(m.tmdbId)) continue;
      seen.add(m.tmdbId);
      merged.push({ ...m, popularity: raw.popularity ?? 0 });
    }
    for (const m of tmdbMapped) {
      if (m.tmdbId == null || seen.has(m.tmdbId)) continue;
      seen.add(m.tmdbId);
      merged.push(m);
    }

    const sorted = sortSearchResultsTimeline(merged);
    const MAX = 40;
    const sliced = sorted.slice(0, MAX);

    if (tmdbData.results?.length) {
      await saveToCache(tmdbData.results, null).catch(() => {});
    }

    let collectionGroups = [];
    let otherResults = sliced;
    let enriched = sliced.map((m) => ({ ...m, mediaType: 'movie' }));
    try {
      enriched = await enrichSearchMoviesWithCollection(sliced);
      const payload = await buildCollectionSearchPayload(enriched);
      collectionGroups = payload.collectionGroups;
      otherResults = payload.otherResults;
    } catch (err) {
      console.warn('[search] collection grouping failed:', err.message);
    }

    const results = enriched;

    const hitIds = [...new Set(enriched.map((m) => m.tmdbId).filter((id) => id != null))];
    if (hitIds.length) {
      MovieCache.updateMany(
        { tmdbId: { $in: hitIds } },
        { $set: { lastSearchedAt: new Date() } },
      ).catch(() => {});
    }

    if (req.authUser?.trackingEnabled !== false) {
      await trackEvent(req.user.sub, 'SEARCH', { query: q });
    }

    const hadDb = dbRaw.length > 0;
    const hadTmdb = tmdbMapped.length > 0;
    const tvTotal = tvSearch.totalResults || 0;
    const source =
      hadDb && hadTmdb ? 'db+tmdb' : hadDb ? 'db' : hadTmdb ? 'tmdb' : 'none';

    res.json({
      results,
      tvResults: tvSearch.results,
      collectionGroups,
      otherResults,
      source,
      tvSource: tvSearch.source,
      page: 1,
      totalResults: (tmdbData.total_results || results.length) + tvTotal,
      totalPages: tmdbData.total_pages || 1,
      tvTotalResults: tvTotal,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuthBackgrounds = async (req, res, next) => {
  try {
    const now = Date.now()
    const cacheAge = now - authBackgroundCache.fetchedAt
    const hasCache = authBackgroundCache.results.length > 0

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')

    if (hasCache && cacheAge < AUTH_BG_CACHE_TTL_MS) {
      return res.json({ results: authBackgroundCache.results, source: 'cache' })
    }

    if (hasCache && cacheAge < AUTH_BG_STALE_MS) {
      refreshAuthBackgroundCache().catch((error) => {
        console.warn('[AuthBG Refresh Failed]', error.message)
      })
      return res.json({ results: authBackgroundCache.results, source: 'stale-cache' })
    }

    const results = await refreshAuthBackgroundCache()
    res.json({ results, source: results.length ? 'fresh' : 'empty' })
  } catch (error) {
    console.error('[AuthBG Error]', error.message)
    res.json({ results: authBackgroundCache.results || [], source: 'error' })
  }
}

exports.getContinueWatching = async (req, res, next) => {
  try {
    const userId = req.user.sub
    const uid = String(userId)

    const IST_OFFSET_MINUTES = 330
    const RETENTION_DAYS = 90
    const istDayMeta = (date = new Date()) => {
      const t = new Date(date)
      const shiftedMs = t.getTime() + IST_OFFSET_MINUTES * 60 * 1000
      const shifted = new Date(shiftedMs)
      const y = shifted.getUTCFullYear()
      const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
      const d = String(shifted.getUTCDate()).padStart(2, '0')
      const dayKey = `${y}-${m}-${d}`
      const dayStartUtcMs = Date.UTC(y, shifted.getUTCMonth(), shifted.getUTCDate()) - IST_OFFSET_MINUTES * 60 * 1000
      const dayStartAt = new Date(dayStartUtcMs)
      const expiresAt = new Date(dayStartUtcMs + RETENTION_DAYS * 24 * 60 * 60 * 1000)
      return { dayKey, dayStartAt, expiresAt }
    }

    let stats = await DailyWatchStat.find({ userId: uid }).sort({ dayStartAt: -1 }).limit(7).lean()

    if (!stats.length) {
      const user = await User.findById(userId).select('watchProgress').lean()
      const items = Array.isArray(user?.watchProgress) ? user.watchProgress : []
      for (const m of items) {
        if (!m?.tmdbId) continue
        const at = m.lastWatchedAt ? new Date(m.lastWatchedAt) : new Date()
        const { dayKey, dayStartAt, expiresAt } = istDayMeta(at)
        const delta = Math.max(0, Math.round(Number(m.watchSeconds) || 0))
        if (!delta) continue

        await DailyWatchStat.updateOne(
          { userId: uid, dayKey },
          {
            $setOnInsert: { dayStartAt, expiresAt },
            $inc: { totalWatchSeconds: delta },
            $push: {
              movies: {
                tmdbId: Number(m.tmdbId),
                title: m.title || '',
                posterUrl: m.posterUrl || '',
                watchSeconds: delta,
                originalLanguage: m.originalLanguage || '',
                genreIds: Array.isArray(m.genreIds) ? m.genreIds : [],
              },
            },
          },
          { upsert: true },
        )
      }
      if (items.length) {
        await User.updateOne({ _id: userId }, { $set: { watchProgress: [] } })
      }
      stats = await DailyWatchStat.find({ userId: uid }).sort({ dayStartAt: -1 }).limit(7).lean()
    }

    const hiddenRows = await HiddenContinueWatching.find({ userId: uid }).select('tmdbId').lean()
    const hidden = new Set(hiddenRows.map((r) => Number(r.tmdbId)).filter((n) => !Number.isNaN(n)))

    const seen = new Set()
    const rawItems = []
    for (const day of stats) {
      const movies = Array.isArray(day.movies) ? day.movies : []
      for (const m of movies) {
        const id = Number(m.tmdbId)
        if (!id || Number.isNaN(id) || seen.has(id) || hidden.has(id)) continue
        seen.add(id)
        rawItems.push(m)
        if (rawItems.length >= 20) break
      }
      if (rawItems.length >= 20) break
    }

    // Split by mediaType
    const movieItems = rawItems.filter(m => m.mediaType !== 'tv')
    const tvItems = rawItems.filter(m => m.mediaType === 'tv')

    // Fetch backdrops for movies
    const movieIds = movieItems.map(m => m.tmdbId)
    const cachedMovies = await MovieCache.find({ tmdbId: { $in: movieIds } }).select('tmdbId backdropPath').lean()
    const movieBackdropMap = new Map(cachedMovies.map(c => [c.tmdbId, c.backdropPath]))

    // Fetch backdrops for TV shows
    const tvIds = tvItems.map(m => m.tmdbId)
    const cachedTV = await TVShowCache.find({ tmdbId: { $in: tvIds } }).select('tmdbId backdropPath').lean()
    const tvBackdropMap = new Map(cachedTV.map(c => [c.tmdbId, c.backdropPath]))

    const results = rawItems.map((m) => {
      const isTV = m.mediaType === 'tv'
      const backdropRaw = isTV ? tvBackdropMap.get(m.tmdbId) : movieBackdropMap.get(m.tmdbId)
      return {
        tmdbId: m.tmdbId,
        title: m.title,
        mediaType: isTV ? 'tv' : 'movie',
        posterPath: m.posterUrl,
        backdropPath: backdropRaw ? `${TMDB_IMG_BACKDROP}${backdropRaw}` : null,
        watchSeconds: Math.max(0, Math.round(Number(m.watchSeconds) || 0)),
        season: m.season || null,
        episode: m.episode || null,
      }
    })

    res.json({ results })
  } catch (err) {
    next(err)
  }
}

exports.saveTVWatchProgress = async (req, res, next) => {
  try {
    const userId = String(req.user.sub)
    const { tmdbId, title, posterUrl, watchSeconds, season, episode } = req.body || {}
    const id = Number(tmdbId)
    if (!id || Number.isNaN(id)) return res.status(400).json({ message: 'Invalid tmdbId' })

    const IST_OFFSET_MINUTES = 330
    const RETENTION_DAYS = 90
    const now = new Date()
    const shiftedMs = now.getTime() + IST_OFFSET_MINUTES * 60 * 1000
    const shifted = new Date(shiftedMs)
    const y = shifted.getUTCFullYear()
    const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0')
    const d = String(shifted.getUTCDate()).padStart(2, '0')
    const dayKey = `${y}-${mo}-${d}`
    const dayStartUtcMs = Date.UTC(y, shifted.getUTCMonth(), shifted.getUTCDate()) - IST_OFFSET_MINUTES * 60 * 1000
    const dayStartAt = new Date(dayStartUtcMs)
    const expiresAt = new Date(dayStartUtcMs + RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const delta = Math.max(0, Math.round(Number(watchSeconds) || 0))

    // Remove old entry for this show, then push fresh one
    await DailyWatchStat.updateOne(
      { userId, dayKey },
      {
        $setOnInsert: { dayStartAt, expiresAt },
        $pull: { movies: { tmdbId: id } },
      },
      { upsert: true },
    )
    await DailyWatchStat.updateOne(
      { userId, dayKey },
      {
        $inc: { totalWatchSeconds: delta },
        $push: {
          movies: {
            $each: [{
              tmdbId: id,
              title: title || '',
              posterUrl: posterUrl || '',
              watchSeconds: delta,
              mediaType: 'tv',
              season: season || null,
              episode: episode || null,
              originalLanguage: '',
              genreIds: [],
            }],
            $position: 0,
          },
        },
      },
    )

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

exports.hideContinueWatching = async (req, res, next) => {
  try {
    const userId = String(req.user.sub)
    const tmdbId = Number(req.body?.tmdbId)
    if (!tmdbId || Number.isNaN(tmdbId)) return res.status(400).json({ message: 'Invalid tmdbId' })

    await HiddenContinueWatching.updateOne(
      { userId, tmdbId },
      { $setOnInsert: { hiddenAt: new Date() } },
      { upsert: true },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
