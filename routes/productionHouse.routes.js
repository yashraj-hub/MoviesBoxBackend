const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/productionHouse.controller')

router.get('/:category', auth, ctrl.listByCategory)
router.get('/:category/:companyId/movies', auth, ctrl.getMovies)

module.exports = router
