const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const trendingController = require('../controllers/trending.controller')

router.get('/:category', authMiddleware, trendingController.getTrendingTop10)

module.exports = router

