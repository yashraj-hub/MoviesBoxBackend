const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/universe.controller')

router.get('/', auth, ctrl.listUniverses)
router.get('/:universeKey', auth, ctrl.getUniverse)

module.exports = router
