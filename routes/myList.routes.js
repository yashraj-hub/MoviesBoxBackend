const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const myListController = require('../controllers/myList.controller')

router.get('/', authMiddleware, myListController.list)
router.get('/check/:tmdbId', authMiddleware, myListController.check)
router.post('/', authMiddleware, myListController.add)
router.delete('/:tmdbId', authMiddleware, myListController.remove)

module.exports = router
