// Remote Imports
const express = require('express')

// Local Imports
const HouseholdController = require('../controllers/household_controller')
const auth = require('../middleware/auth')

// Router Setup
const router = express.Router()

// Middleware to inject Socket.IO
const injectIo = io => (req, _, next) => {
  req.io = io
  next()
}

// Route Configuration
const configureRoutes = io => {
  // Inject Socket.IO into requests
  router.use(injectIo(io))

  // Protected Routes
  router.post('/', auth, HouseholdController.create)
  router.get('/:householdId', auth, HouseholdController.getDetails)
  router.put('/:householdId', auth, HouseholdController.update)
  router.post('/join', auth, HouseholdController.join)
  router.post('/:householdId/refresh-invite', auth, HouseholdController.refreshInviteCode)

  return router
}

// Exports
module.exports = configureRoutes 