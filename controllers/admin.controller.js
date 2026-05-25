const mongoose = require('mongoose')
const User = require('../models/User')
const MovieCache = require('../models/MovieCache')
const analyticsConn = require('../config/databases/analytics')
const DailyLoginStat = require('../models/DailyLoginStat')
const DailyWatchStat = require('../models/DailyWatchStat')
const DailySiteActiveStat = require('../models/DailySiteActiveStat')
const HiddenContinueWatching = require('../models/HiddenContinueWatching')

exports.getDbStats = async (req, res, next) => {
  try {
    const [mainStats, analyticsStats] = await Promise.all([
      mongoose.connection.db.command({ dbStats: 1, scale: 1024 * 1024 }),
      analyticsConn.db.command({ dbStats: 1, scale: 1024 * 1024 }),
    ])

    const format = (s) => ({
      name: s.db,
      sizeMB: parseFloat(s.dataSize?.toFixed(2) || 0),
      storageMB: parseFloat(s.storageSize?.toFixed(2) || 0),
      totalSizeMB: parseFloat(s.totalSize?.toFixed(2) || 0),
      collections: s.collections || 0,
      objects: s.objects || 0,
      // MongoDB Atlas free tier = 512 MB
      limitMB: 512,
    })

    res.json({
      main: format(mainStats),
      analytics: format(analyticsStats),
    })
  } catch (err) {
    next(err)
  }
}

const toUserResponse = (user) => ({
  id: user._id.toString(),
  userId: user.userId,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  trackingEnabled: user.trackingEnabled !== false,
  canFlag: user.canFlag === true,
  avatar: user.avatar || '',
  createdAt: user.createdAt,
  sessions: user.sessions,
  signupContext: user.signupContext
});

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(toUserResponse));
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    res.json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateUserTracking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingEnabled } = req.body;
    const user = await User.findByIdAndUpdate(id, { trackingEnabled: trackingEnabled !== false }, { new: true });
    res.json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('userId').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const uid = user._id.toString()

    await Promise.all([
      User.findByIdAndDelete(id),
      DailyLoginStat.deleteMany({ userId: uid }),
      DailyWatchStat.deleteMany({ userId: uid }),
      DailySiteActiveStat.deleteMany({ userId: uid }),
      HiddenContinueWatching.deleteMany({ userId: uid }),
    ])

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.forceLogoutSession = async (req, res, next) => {
  try {
    const { userId, tokenId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { sessions: { tokenId } } },
      { new: true }
    );
    res.json({ user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

exports.getUserMyList = async (req, res, next) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId).select('myList').lean()
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ userId, items: Array.isArray(user.myList) ? user.myList : [] })
  } catch (err) {
    next(err)
  }
}

exports.getUserDayAnalytics = async (req, res, next) => {
  try {
    const { userId, dayKey } = req.params
    if (!userId || !dayKey) return res.status(400).json({ message: 'userId and dayKey are required' })

    const [loginDoc, watchDoc, siteDoc] = await Promise.all([
      DailyLoginStat.findOne({ userId, dayKey }).lean(),
      DailyWatchStat.findOne({ userId, dayKey }).lean(),
      DailySiteActiveStat.findOne({ userId, dayKey }).lean(),
    ])

    res.json({
      userId,
      dayKey,
      loginCount: Number(loginDoc?.loginCount || 0),
      totalWatchSeconds: Number(watchDoc?.totalWatchSeconds || 0),
      watchHours: Number(((watchDoc?.totalWatchSeconds || 0) / 3600).toFixed(2)),
      siteActiveSeconds: Number(siteDoc?.siteActiveSeconds || 0),
      siteActiveHours: Number(((siteDoc?.siteActiveSeconds || 0) / 3600).toFixed(2)),
      movies: Array.isArray(watchDoc?.movies) ? watchDoc.movies : [],
    })
  } catch (err) {
    next(err)
  }
}

exports.getUserWatchHistory = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const days = parseDays(req.query.days, 90, 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const docs = await DailyWatchStat.find({ userId, dayStartAt: { $gte: since } })
      .select('dayKey dayStartAt totalWatchSeconds movies')
      .sort({ dayKey: -1 })
      .lean()

    res.json({ userId, days, items: docs })
  } catch (err) {
    next(err)
  }
}

exports.deleteUserWatchHistory = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (!userId) return res.status(400).json({ message: 'userId is required' })

    const dayKey = String(req.query.dayKey || '').trim()
    if (dayKey) {
      await DailyWatchStat.deleteOne({ userId, dayKey })
      return res.json({ ok: true, userId, dayKey })
    }

    await Promise.all([
      DailyWatchStat.deleteMany({ userId }),
      HiddenContinueWatching.deleteMany({ userId }),
    ])

    res.json({ ok: true, userId, deletedAll: true })
  } catch (err) {
    next(err)
  }
}

// Users with a site-activity ping in the last N minutes
exports.getLiveWatchers = async (req, res, next) => {
  try {
    const minutes = Math.max(1, parseInt(req.query.minutes, 10) || 5)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 30))
    const since = new Date(Date.now() - minutes * 60 * 1000)

    const users = await User.find({
      trackingEnabled: { $ne: false },
      isActive: { $ne: false },
      lastSiteActiveAt: { $gte: since },
    })
      .select('userId fullName email lastSiteActiveAt')
      .sort({ lastSiteActiveAt: -1 })
      .limit(limit)
      .lean()

    const items = users.map((u) => ({
      userId: u.userId,
      fullName: u.fullName,
      email: u.email,
      lastSiteActiveAt: u.lastSiteActiveAt,
    }))

    res.json({ minutes, items })
  } catch (err) {
    next(err)
  }
}

function parseDays(v, fallback = 30, max = 90) {
  const n = parseInt(v, 10)
  if (!n || Number.isNaN(n)) return fallback
  return Math.max(1, Math.min(max, n))
}

exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const days = parseDays(req.query.days, 30, 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [loginRows, siteRows] = await Promise.all([
      DailyLoginStat.find({ dayStartAt: { $gte: since } })
        .select('dayKey loginCount userId')
        .lean(),
      DailySiteActiveStat.find({ dayStartAt: { $gte: since } })
        .select('dayKey siteActiveSeconds userId')
        .lean(),
    ])

    const byDay = new Map()
    const globalActiveUsers = new Set()

    for (const r of loginRows) {
      if (!byDay.has(r.dayKey)) {
        byDay.set(r.dayKey, {
          dayKey: r.dayKey,
          loginCount: 0,
          activeUsers: new Set(),
          watchHours: 0,
          siteActiveHours: 0,
        })
      }
      const row = byDay.get(r.dayKey)
      row.loginCount += Number(r.loginCount || 0)
      if (r.userId) {
        const uid = String(r.userId)
        row.activeUsers.add(uid)
        globalActiveUsers.add(uid)
      }
    }

    for (const r of siteRows) {
      if (!byDay.has(r.dayKey)) {
        byDay.set(r.dayKey, {
          dayKey: r.dayKey,
          loginCount: 0,
          activeUsers: new Set(),
          watchHours: 0,
          siteActiveHours: 0,
        })
      }
      const row = byDay.get(r.dayKey)
      row.siteActiveHours += Number(r.siteActiveSeconds || 0) / 3600
      if (r.userId) {
        const uid = String(r.userId)
        row.activeUsers.add(uid)
        globalActiveUsers.add(uid)
      }
    }

    const timeline = [...byDay.values()]
      .map((r) => ({
        dayKey: r.dayKey,
        loginCount: r.loginCount,
        activeUsers: r.activeUsers.size,
        siteActiveHours: Number((r.siteActiveHours || 0).toFixed(2)),
      }))
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))

    const summary = {
      totalLoginCount: timeline.reduce((s, d) => s + d.loginCount, 0),
      totalSiteActiveHours: Number(timeline.reduce((s, d) => s + d.siteActiveHours, 0).toFixed(2)),
      activeUsers: globalActiveUsers.size,
    }

    res.json({ days, summary, timeline })
  } catch (error) {
    next(error)
  }
}

exports.getUserAnalytics = async (req, res, next) => {
  try {
    const days = parseDays(req.query.days, 90, 90)
    const userId = req.params.userId
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [logins, site] = await Promise.all([
      DailyLoginStat.find({ userId, dayStartAt: { $gte: since } })
        .select('dayKey loginCount lastLoginAt')
        .lean(),
      DailySiteActiveStat.find({ userId, dayStartAt: { $gte: since } })
        .select('dayKey siteActiveSeconds')
        .lean(),
    ])

    const map = new Map()

    for (const r of logins) {
      if (!r.dayKey) continue
      map.set(r.dayKey, {
        dayKey: r.dayKey,
        loginCount: Number(r.loginCount || 0),
        siteActiveHours: 0,
      })
    }

    for (const r of site) {
      if (!r.dayKey) continue
      const row = map.get(r.dayKey) || { dayKey: r.dayKey, loginCount: 0, siteActiveHours: 0 }
      row.siteActiveHours = Number((Number(r.siteActiveSeconds || 0) / 3600).toFixed(2))
      map.set(r.dayKey, row)
    }

    const timeline = [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))

    res.json({
      userId,
      days,
      summary: {
        totalLogins: timeline.reduce((s, d) => s + d.loginCount, 0),
        totalSiteActiveHours: Number(timeline.reduce((s, d) => s + d.siteActiveHours, 0).toFixed(2)),
      },
      timeline,
    })
  } catch (err) {
    next(err)
  }
}

// Reset a user's password (admin)
exports.resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    if (!newPassword || String(newPassword).length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    const bcrypt = require('bcryptjs')
    const hashed = await bcrypt.hash(String(newPassword), 10)
    const user = await User.findByIdAndUpdate(id, { password: hashed }, { new: true })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ ok: true })
  } catch (err) { next(err) }
}

// Toggle canFlag permission
exports.updateCanFlag = async (req, res, next) => {
  try {
    const { id } = req.params
    const { canFlag } = req.body
    const user = await User.findByIdAndUpdate(id, { canFlag: canFlag === true }, { new: true })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: toUserResponse(user) })
  } catch (err) { next(err) }
}

// Flag/unflag a movie + optional custom stream URL
exports.flagMovie = async (req, res, next) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId)
    if (!tmdbId) return res.status(400).json({ message: 'Invalid tmdbId' })

    const { redFlagged, streamUrl = '', flaggedBy = '' } = req.body
    if (typeof redFlagged !== 'boolean') return res.status(400).json({ message: 'redFlagged (boolean) is required' })

    const cleanUrl = String(streamUrl || '').trim()
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      return res.status(400).json({ message: 'Invalid stream URL' })
    }

    const movie = await MovieCache.findOneAndUpdate(
      { tmdbId },
      { $set: { redFlagged, streamUrl: cleanUrl, flaggedBy: redFlagged ? String(flaggedBy || '').trim() : '' } },
      { new: true, upsert: false }
    ).lean()

    if (!movie) return res.status(404).json({ message: 'Movie not found in cache' })

    res.json({
      ok: true,
      tmdbId: movie.tmdbId,
      title: movie.title,
      redFlagged: movie.redFlagged,
      streamUrl: movie.streamUrl || '',
      flaggedBy: movie.flaggedBy || '',
    })
  } catch (err) {
    next(err)
  }
}

// Get all red-flagged movies
exports.getFlaggedMovies = async (req, res, next) => {
  try {
    const movies = await MovieCache.find({ redFlagged: true })
      .select('tmdbId title posterPath redFlagged streamUrl flaggedBy')
      .lean()
    res.json({ items: movies.map(m => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterUrl: m.posterPath ? `https://image.tmdb.org/t/p/w342${m.posterPath}` : null,
      redFlagged: m.redFlagged,
      streamUrl: m.streamUrl || '',
      flaggedBy: m.flaggedBy || '',
    })) })
  } catch (err) {
    next(err)
  }
}
