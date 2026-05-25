const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const movieDetailController = require('../controllers/movie.detail.controller');
const personController = require('../controllers/person.controller');
const productionHouseController = require('../controllers/productionHouse.controller');
const authMiddleware = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

const canFlagOnly = (req, res, next) => {
  if (req.authUser && (req.authUser.role === 'admin' || req.authUser.canFlag === true)) return next()
  res.status(403).json({ message: 'Flag permission required' })
}

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
router.patch('/movies/:tmdbId/flag', authMiddleware, canFlagOnly, adminController.flagMovie);
router.get('/continue-watching', authMiddleware, movieController.getContinueWatching);
router.post('/continue-watching/hide', authMiddleware, movieController.hideContinueWatching);

module.exports = router;
