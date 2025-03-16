const express = require('express')
const router = express.Router()

// Importando rotas
const authRoutes = require('./auth_routes')
const householdRoutes = require('./household_routes')
const catRoutes = require('./cat_routes')

// Registrando rotas
router.use('/auth', authRoutes)
router.use('/households', householdRoutes)
router.use('/cats', catRoutes)

module.exports = router 