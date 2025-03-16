const express = require('express')
const router = express.Router()

// Importando rotas
const authRoutes = require('./auth_routes')
const householdRoutes = require('./household_routes')
const catRoutes = require('./cat_routes')
const catGroupRoutes = require('./cat_group_routes')
const scheduleRoutes = require('./schedule_routes')
const feedingLogRoutes = require('./feeding_log_routes')

// Registrando rotas
router.use('/auth', authRoutes)
router.use('/households', householdRoutes)
router.use('/cats', catRoutes)
router.use('/cat-groups', catGroupRoutes)
router.use('/schedules', scheduleRoutes)
router.use('/feeding-logs', feedingLogRoutes)

module.exports = router 