const DailyLoginStat = require('../models/DailyLoginStat')
const DailyWatchStat = require('../models/DailyWatchStat')
const DailySiteActiveStat = require('../models/DailySiteActiveStat')

const IST_OFFSET_MINUTES = 330
const RETENTION_DAYS = 90

function istDayMeta(date = new Date()) {
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

async function trackDailyLogin(userId, at = new Date()) {
  try {
    const { dayKey, dayStartAt, expiresAt } = istDayMeta(at)
    await DailyLoginStat.updateOne(
      { userId: String(userId), dayKey },
      {
        $setOnInsert: { dayStartAt, expiresAt },
        $set: { lastLoginAt: at },
        $inc: { loginCount: 1 },
      },
      { upsert: true },
    )
  } catch (err) {
    console.error('[DailyLoginTrack Failed]', err.message)
  }
}

async function trackDailySiteActive({ userId, activeSeconds = 0, at = new Date() }) {
  try {
    const delta = Math.max(0, Math.round(Number(activeSeconds) || 0))
    if (!delta || !userId) return

    const { dayKey, dayStartAt, expiresAt } = istDayMeta(at)
    const uid = String(userId)

    await DailySiteActiveStat.updateOne(
      { userId: uid, dayKey },
      {
        $inc: { siteActiveSeconds: delta },
        $setOnInsert: {
          dayStartAt,
          expiresAt,
        },
      },
      { upsert: true },
    )
  } catch (err) {
    console.error('[DailySiteActiveTrack Failed]', err.message)
  }
}

async function trackDailyWatch({
  userId,
  tmdbId,
  title = '',
  posterUrl = '',
  originalLanguage = '',
  genreIds = [],
  watchSeconds = 0,
  at = new Date(),
}) {
  try {
    const delta = Math.max(0, Math.round(Number(watchSeconds) || 0))
    if (!delta || !userId || !tmdbId) return

    const { dayKey, dayStartAt, expiresAt } = istDayMeta(at)
    const uid = String(userId)

    const cleanGenreIds = [...new Set((Array.isArray(genreIds) ? genreIds : []).map((n) => Number(n)).filter((n) => !Number.isNaN(n)))]

    const existing = await DailyWatchStat.findOne({ userId: uid, dayKey }).lean()
    const doc = existing || {
      userId: uid,
      dayKey,
      dayStartAt,
      totalWatchSeconds: 0,
      movies: [],
      expiresAt,
    }

    doc.totalWatchSeconds = Math.max(0, Number(doc.totalWatchSeconds || 0) + delta)
    doc.expiresAt = expiresAt

    const movies = Array.isArray(doc.movies) ? [...doc.movies] : []
    const idx = movies.findIndex((m) => Number(m.tmdbId) === Number(tmdbId))
    if (idx >= 0) {
      movies[idx] = {
        ...movies[idx],
        title: title || movies[idx].title || '',
        posterUrl: posterUrl || movies[idx].posterUrl || '',
        originalLanguage: originalLanguage || movies[idx].originalLanguage || '',
        genreIds: cleanGenreIds.length ? cleanGenreIds : movies[idx].genreIds || [],
        watchSeconds: Math.max(0, Number(movies[idx].watchSeconds || 0) + delta),
      }
    } else {
      movies.push({
        tmdbId: Number(tmdbId),
        title,
        posterUrl,
        watchSeconds: delta,
        originalLanguage,
        genreIds: cleanGenreIds,
      })
    }
    movies.sort((a, b) => Number(b.watchSeconds || 0) - Number(a.watchSeconds || 0))

    await DailyWatchStat.updateOne(
      { userId: uid, dayKey },
      {
        $set: {
          totalWatchSeconds: doc.totalWatchSeconds,
          movies: movies.slice(0, 100),
          expiresAt: doc.expiresAt,
        },
        $setOnInsert: {
          dayStartAt: doc.dayStartAt,
        },
      },
      { upsert: true },
    )
  } catch (err) {
    console.error('[DailyWatchTrack Failed]', err.message)
  }
}

module.exports = {
  RETENTION_DAYS,
  trackDailyLogin,
  trackDailySiteActive,
  trackDailyWatch,
}
