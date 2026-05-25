const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const tvController = require('../controllers/tv.controller')

router.get('/genres', authMiddleware, tvController.getTVGenres)
router.get('/discover/:shelf', authMiddleware, tvController.getTVShelf)
router.get('/genre/:genreId/shows', authMiddleware, tvController.getTVGenreShows)
router.get('/:tmdbId/related', authMiddleware, tvController.getTVRelatedShows)
router.get('/trending', authMiddleware, tvController.getTrendingTVShows)
router.get('/:tmdbId', authMiddleware, tvController.getTVDetail)
router.get('/:tmdbId/season/:seasonNumber', authMiddleware, tvController.getTVSeason)

module.exports = router
