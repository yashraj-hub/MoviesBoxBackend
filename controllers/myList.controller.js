const mongoose = require('mongoose')
const User = require('../models/User')

const MAX_MY_LIST = 500

function userId(req) {
  const id = req.user?.sub
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null
  return new mongoose.Types.ObjectId(id)
}

exports.list = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })
    const user = await User.findById(oid).select('myList').lean()
    const raw = user?.myList || []
    const items = [...raw].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    res.json({ items })
  } catch (err) {
    next(err)
  }
}

exports.check = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })
    const tmdbId = parseInt(req.params.tmdbId, 10)
    if (!tmdbId) return res.status(400).json({ message: 'Invalid movie ID' })
    const user = await User.findOne({ _id: oid, 'myList.tmdbId': tmdbId }).select('_id').lean()
    res.json({ inList: Boolean(user) })
  } catch (err) {
    next(err)
  }
}

/**
 * Use $push update only — avoid user.save(), which re-validates the whole User document
 * (some legacy rows can fail fullName / other required paths even though the session is valid).
 */
exports.add = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })

    const tmdbId = parseInt(req.body?.tmdbId, 10)
    if (!tmdbId) return res.status(400).json({ message: 'tmdbId is required' })
    const title = String(req.body?.title || '').trim().slice(0, 300)
    const posterUrl = String(req.body?.posterUrl || '').trim().slice(0, 500)

    const dup = await User.findOne({ _id: oid, 'myList.tmdbId': tmdbId }).select('_id').lean()
    if (dup) return res.json({ ok: true, inList: true })

    const u = await User.findById(oid).select('myList').lean()
    if (!u) return res.status(404).json({ message: 'User not found' })
    const list = Array.isArray(u.myList) ? u.myList : []
    if (list.length >= MAX_MY_LIST) {
      return res.status(400).json({ message: `You can save at most ${MAX_MY_LIST} movies` })
    }

    const item = { tmdbId, title, posterUrl, addedAt: new Date() }
    await User.updateOne({ _id: oid }, { $push: { myList: { $each: [item], $position: 0 } } })
    return res.status(201).json({ ok: true, inList: true })
  } catch (err) {
    next(err)
  }
}

exports.remove = async (req, res, next) => {
  try {
    const oid = userId(req)
    if (!oid) return res.status(401).json({ message: 'Invalid session' })
    const tmdbId = parseInt(req.params.tmdbId, 10)
    if (!tmdbId) return res.status(400).json({ message: 'Invalid movie ID' })

    await User.updateOne({ _id: oid }, { $pull: { myList: { tmdbId } } })
    res.json({ ok: true, inList: false })
  } catch (err) {
    next(err)
  }
}
