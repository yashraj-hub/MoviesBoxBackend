const mongoose = require('mongoose');

const connectAnalyticsDB = () => {
  const analyticsUri = process.env.ANALYTICS_MONGO_URI;
  if (analyticsUri && typeof analyticsUri === 'string') {
    const analyticsConn = mongoose.createConnection(analyticsUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    analyticsConn.on('connected', () => {
      console.log('Analytics Database Connected Successfully ✅');
    });

    analyticsConn.on('error', (err) => {
      console.error('Analytics Database Connection Failed ❌', err.message);
    });

    return analyticsConn;
  }

  const mainUri = process.env.MONGO_URI;
  if (mainUri && typeof mainUri === 'string') {
    const dbName = process.env.ANALYTICS_DB_NAME || 'moviesbox_analytics';
    console.warn(`ANALYTICS_MONGO_URI not found. Using mongoose.useDb("${dbName}") for analytics database.`);
    return mongoose.connection.useDb(dbName);
  }

  console.error('Analytics DB disabled: missing ANALYTICS_MONGO_URI and MONGO_URI. Falling back to main mongoose connection object.');
  return mongoose.connection;

};

module.exports = connectAnalyticsDB();
