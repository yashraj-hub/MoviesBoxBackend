const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth');

// Admin Check Middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

router.use(authMiddleware);
router.use(adminOnly);

router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/tracking', adminController.updateUserTracking);
router.delete('/users/:id', adminController.deleteUser);
router.delete('/users/:userId/sessions/:tokenId', adminController.forceLogoutSession);
router.get('/db-stats', adminController.getDbStats);
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/users/:userId', adminController.getUserAnalytics);
router.get('/analytics/users/:userId/day/:dayKey', adminController.getUserDayAnalytics);
router.get('/analytics/users/:userId/watch-history', adminController.getUserWatchHistory);
router.delete('/analytics/users/:userId/watch-history', adminController.deleteUserWatchHistory);
router.get('/analytics/live-watchers', adminController.getLiveWatchers);
router.get('/users/:userId/my-list', adminController.getUserMyList);

module.exports = router;
