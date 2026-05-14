const mongoose = require('mongoose');
const analyticsConn = require('../config/databases/analytics');

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  metadata: { type: Object, default: {} },
  clientInfo: {
    userAgent: String,
    platform: String,
    ip: String,
  },
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  collection: 'user_activities' 
});

activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

// We use the specific analytics connection to create the model
module.exports = analyticsConn.model('Activity', activitySchema);
