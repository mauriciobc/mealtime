// Remote Imports
const express = require('express')

// Local Imports
const HouseholdController = require('../controllers/household_controller')
const { authenticate } = require('../middleware/auth')

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

  // Public Routes
  router.get('/timezones', HouseholdController.listTimezones)
  
  // Protected Routes
  router.post('/', authenticate, HouseholdController.create)
  router.get('/:householdId', authenticate, HouseholdController.getDetails)
  router.put('/:householdId', authenticate, HouseholdController.update)
  router.post('/join', authenticate, HouseholdController.join)
  router.post('/:householdId/refresh-invite', authenticate, HouseholdController.refreshInviteCode)
  router.patch('/:householdId/timezone', authenticate, HouseholdController.updateTimezone)

  return router
}

// Exports
module.exports = configureRoutes 