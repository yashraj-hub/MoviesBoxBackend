const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const movieDetailController = require('../controllers/movie.detail.controller');
const personController = require('../controllers/person.controller');
const productionHouseController = require('../controllers/productionHouse.controller');
const authMiddleware = require('../middleware/auth');

// Public route for backgrounds
router.get('/public/auth-backgrounds', movieController.getAuthBackgrounds);

// Protected routes
router.get('/browse/:category', authMiddleware, movieController.browseByCategory);
router.get('/search', authMiddleware, movieController.search);
router.get('/genre/:genreId/movies', authMiddleware, movieController.browseByGenre);
router.get('/person/:personId/movies', authMiddleware, personController.getPersonMovies);
router.get('/company/:companyId/movies', authMiddleware, productionHouseController.getCompanyMovies);
router.get('/movies/:tmdbId', authMiddleware, movieDetailController.getMovieDetail);
router.get('/movies/:tmdbId/related', authMiddleware, movieDetailController.getRelatedMovies);
router.get('/continue-watching', authMiddleware, movieController.getContinueWatching);
router.post('/continue-watching/hide', authMiddleware, movieController.hideContinueWatching);

module.exports = router;
