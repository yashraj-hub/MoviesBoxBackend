const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/category.controller')

router.get('/zone/:zone', auth, ctrl.listByZone)
router.get('/:slug/movies', auth, ctrl.getMovies)

module.exports = router
