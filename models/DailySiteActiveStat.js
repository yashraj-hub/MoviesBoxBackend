const mongoose = require('mongoose')
const analyticsConn = require('../config/databases/analytics')

const dailySiteActiveStatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    dayStartAt: { type: Date, required: true, index: true },
    siteActiveSeconds: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'daily_site_active_stats',
  },
)

dailySiteActiveStatSchema.index({ userId: 1, dayKey: 1 }, { unique: true })
dailySiteActiveStatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = analyticsConn.model('DailySiteActiveStat', dailySiteActiveStatSchema)
