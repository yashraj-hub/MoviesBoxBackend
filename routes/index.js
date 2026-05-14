const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const movieRoutes = require('./movie.routes');
const adminRoutes = require('./admin.routes');
const heroRoutes = require('./hero.routes');
const trendingRoutes = require('./trending.routes');
const productionHouseRoutes = require('./productionHouse.routes');
const categoryRoutes = require('./category.routes');
const myListRoutes = require('./myList.routes');
const siteActiveRoutes = require('./siteActive.routes');

router.use('/auth', authRoutes);
router.use('/my-list', myListRoutes);
router.use('/site-active', siteActiveRoutes);
router.use('/admin', adminRoutes);
router.use('/hero', heroRoutes);
router.use('/trending', trendingRoutes);
router.use('/production-house', productionHouseRoutes);
router.use('/categories', categoryRoutes);
router.use('/', movieRoutes);

module.exports = router;
