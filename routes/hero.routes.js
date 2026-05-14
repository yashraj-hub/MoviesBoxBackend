const express = require('express')
const router = express.Router()
const heroController = require('../controllers/hero.controller')
const authMiddleware = require('../middleware/auth')

router.get('/:category', authMiddleware, heroController.getHeroByCategory)

module.exports = router

