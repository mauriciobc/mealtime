const express = require('express')
const feedingLogController = require('../controllers/feeding_log_controller')
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

  // Rotas de registros de alimentação
  router.get('/:logId', feedingLogController.getDetails)

  return router
}

// Exports
module.exports = configureRoutes
