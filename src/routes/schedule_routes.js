const express = require('express')
const scheduleController = require('../controllers/schedule_controller')
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

  // Middleware de autenticação para todas as rotas
  router.use(authenticate)

  // Rotas de agendamentos
  router.put('/:scheduleId', scheduleController.update)
  router.delete('/:scheduleId', scheduleController.remove)

  return router
}

// Exports
module.exports = configureRoutes
