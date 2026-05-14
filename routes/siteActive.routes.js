const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const ctrl = require('../controllers/siteActive.controller')

router.post('/', auth, ctrl.ingest)
router.post('/unified', auth, ctrl.unifiedIngest)

module.exports = router
