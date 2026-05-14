/**
 * Activity Tracking Service
 * Uses a separate database connection for analytics.
 */
const Activity = require('../models/Activity');

const trackEvent = async (userId, eventType, metadata = {}) => {
  try {
    const activityData = {
      userId: userId.toString(),
      eventType, // e.g., 'LOGIN', 'SEARCH', 'VIEW_MOVIE', 'LOGOUT'
      metadata,
      clientInfo: {
        userAgent: metadata.userAgent || '',
        platform: metadata.platform || '',
        ip: metadata.ip || '',
      },
      timestamp: new Date()
    };

    // This will save to the analytics database defined in Activity model
    await Activity.create(activityData);
    
    console.log(`[Activity Logged] ${eventType} for User: ${userId}`);
  } catch (error) {
    console.error('[Activity Tracking Failed]', error.message);
  }
};

module.exports = {
  trackEvent
};
