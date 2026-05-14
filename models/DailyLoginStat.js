const mongoose = require('mongoose')
const analyticsConn = require('../config/databases/analytics')

const dailyLoginStatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true }, // yyyy-mm-dd (IST)
    dayStartAt: { type: Date, required: true, index: true },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    collection: 'daily_login_stats',
  },
)

dailyLoginStatSchema.index({ userId: 1, dayKey: 1 }, { unique: true })
dailyLoginStatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = analyticsConn.model('DailyLoginStat', dailyLoginStatSchema)
