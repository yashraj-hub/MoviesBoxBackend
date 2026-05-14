const mongoose = require('mongoose')
const User = require('../models/User')
const { trackDailySiteActive, trackDailyWatch } = require('../services/dailyAnalytics.service')

const MAX_ACTIVE_SECONDS_PER_REQUEST = 1200

function userId(req) {
  const id = req.user?.sub
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null
  return new mongoose.Types.ObjectId(id)
}

// ... existing ingest logic ...

exports.unifiedIngest = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })

    const { activities } = req.body
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.json({ ok: true, ignored: true })
    }

    const u = await User.findById(oid).select('trackingEnabled').lean()
    if (!u || u.trackingEnabled === false) return res.json({ ok: true, trackingDisabled: true })

    const now = new Date()
    const uid = oid.toString()
    let watchActivities = 0

    for (const act of activities) {
      const { duration, movie, timestamp } = act
      const at = new Date(timestamp || now)

      await trackDailySiteActive({ userId: uid, activeSeconds: duration, at })

      if (movie && movie.tmdbId) {
        watchActivities += 1
        await trackDailyWatch({
          userId: uid,
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterUrl: movie.posterUrl,
          genreIds: movie.genreIds,
          originalLanguage: movie.originalLanguage,
          watchSeconds: duration,
          at,
        })
      }
    }

    await User.updateOne({ _id: oid }, { $set: { lastSiteActiveAt: now } })

    res.json({ ok: true, count: activities.length, watchActivities })
  } catch (err) {
    next(err)
  }
}

// Keeping old ingest for compatibility if needed
exports.ingest = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })

    let activeSeconds = Number(req.body?.activeSeconds)
    if (Number.isNaN(activeSeconds)) activeSeconds = 0
    activeSeconds = Math.max(0, Math.min(MAX_ACTIVE_SECONDS_PER_REQUEST, Math.round(activeSeconds)))

    const u = await User.findById(oid).select('trackingEnabled').lean()
    if (!u) return res.status(404).json({ message: 'User not found' })
    if (u.trackingEnabled === false) return res.json({ ok: true, trackingDisabled: true })

    const now = new Date()

    // Keeps admin “live” accurate when user is idle but tab still open (no active seconds this interval).
    if (req.body?.heartbeat === true && activeSeconds <= 0) {
      await User.updateOne({ _id: oid }, { $set: { lastSiteActiveAt: now } })
      return res.json({ ok: true, heartbeat: true })
    }

    if (activeSeconds <= 0) return res.json({ ok: true, ignored: true })

    await Promise.all([
      trackDailySiteActive({ userId: oid.toString(), activeSeconds, at: now }),
      User.updateOne({ _id: oid }, { $set: { lastSiteActiveAt: now } }),
    ])

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
