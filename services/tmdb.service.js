const MovieCache = require('../models/MovieCache');

const TMDB_TOKENS = [
  process.env.TMDB_TOKEN_1,
  process.env.TMDB_TOKEN_2
].filter(Boolean);

let currentTokenIndex = 0;

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w342';       // posters (cards)
const TMDB_IMG_BACKDROP = 'https://image.tmdb.org/t/p/w1280';  // hero/backdrop
const TMDB_IMG_FACE = 'https://image.tmdb.org/t/p/w185';       // cast/crew
const TMDB_IMG_LOGO = 'https://image.tmdb.org/t/p/w300';       // company/movie logos
const TMDB_IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

/**
 * Get next available token (Round Robin)
 */
const getNextToken = () => {
  if (TMDB_TOKENS.length === 0) return null;
  const token = TMDB_TOKENS[currentTokenIndex];
  currentTokenIndex = (currentTokenIndex + 1) % TMDB_TOKENS.length;
  return token;
};

/**
 * Common fetch helper for TMDB with Load Balancing
 */
const tmdbFetch = async (path, query = {}, retryCount = 0) => {
  const token = getNextToken();
  const params = new URLSearchParams(query).toString();
  const url = `${TMDB_BASE_URL}/${path}${params ? '?' + params : ''}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429 || res.status === 401) {
      // If rate limited or unauthorized, try with next token
      if (retryCount < TMDB_TOKENS.length) {
        console.warn(`[TMDB] Token ${currentTokenIndex} failed, retrying with next...`);
        return tmdbFetch(path, query, retryCount + 1);
      }
    }

    if (!res.ok) throw new Error(`TMDB API Error: ${res.statusText}`);
    return res.json();
  } catch (error) {
    if (retryCount < TMDB_TOKENS.length) {
      return tmdbFetch(path, query, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Normalize TMDB movie objects from search/discover (genre_ids) or full detail (genres[]).
 */
const normalizeTmdbMovieDoc = (m) => {
  if (!m) return null;
  const id = m.id ?? m.tmdbId;
  if (id == null) return null;
  const genreIds = Array.isArray(m.genre_ids) && m.genre_ids.length
    ? m.genre_ids
    : Array.isArray(m.genres)
      ? m.genres.map((g) => g.id).filter((n) => n != null)
      : [];
  return { ...m, id, genre_ids: genreIds };
};

/**
 * Save movies to local cache with a category.
 * @param {object[]} movies — TMDB search/discover rows or GET /movie/{id} bodies
 * @param {string|null} category
 */
const saveToCache = async (movies, category = null) => {
  if (!movies?.length) return;
  const rows = movies.map(normalizeTmdbMovieDoc).filter(Boolean);
  if (!rows.length) return;

  const ops = rows.map((m) => ({
    updateOne: {
      filter: { tmdbId: m.id },
      update: {
        $set: {
          tmdbId: m.id,
          title: m.title || 'Untitled',
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
          collectionId: m.belongs_to_collection?.id || null,
          collectionName: m.belongs_to_collection?.name || null,
          ...(category && { category }),
          cachedAt: new Date(),
        },
        $addToSet: {
          productionCompanyIds: {
            $each: (m.production_companies || []).map((c) => c.id).filter((n) => n != null),
          },
        },
      },
      upsert: true,
    },
  }));
  await MovieCache.bulkWrite(ops);
};

/**
 * Sync logic: Refresh data if older than 6 hours
 */
const syncIfNeeded = async (category) => {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  
  // Check if we have fresh data for this category
  const freshCount = await MovieCache.countDocuments({
    category,
    cachedAt: { $gte: sixHoursAgo }
  });

  if (freshCount < 10) {
    console.log(`[Sync] Refreshing ${category} movies from TMDB...`);
    let tmdbPath = '';
    let query = { language: 'en-US', page: 1 };

    if (category === 'bollywood') {
      tmdbPath = 'discover/movie';
      query.with_original_language = 'hi';
      query.sort_by = 'primary_release_date.desc';
    } else if (category === 'hollywood') {
      tmdbPath = 'discover/movie';
      query.with_original_language = 'en';
      query.sort_by = 'popularity.desc';
    } else if (category === 'animation') {
      tmdbPath = 'discover/movie';
      query.with_genres = '16';
      query.sort_by = 'popularity.desc';
    }

    if (tmdbPath) {
      const data = await tmdbFetch(tmdbPath, query);
      await saveToCache(data.results, category);
    }
  }
};

module.exports = {
  tmdbFetch,
  saveToCache,
  syncIfNeeded,
  TMDB_IMG_BASE,
  TMDB_IMG_BACKDROP,
  TMDB_IMG_FACE,
  TMDB_IMG_LOGO,
  TMDB_IMG_ORIGINAL,
};
