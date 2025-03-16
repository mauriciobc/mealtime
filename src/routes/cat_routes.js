const express = require('express')
const catController = require('../controllers/cat_controller')
const scheduleController = require('../controllers/schedule_controller')
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

  // Rotas principais
  router.post('/', catController.create)
  router.get('/', catController.list)
  router.get('/:catId', catController.getDetails)
  router.put('/:catId', catController.update)
  router.delete('/:catId', catController.remove)

  // Rotas de grupos
  router.post('/:catId/groups/:groupId', catController.addToGroup)
  router.delete('/:catId/groups/:groupId', catController.removeFromGroup)
  
  // Rotas de agendamentos
  router.post('/:catId/schedules', scheduleController.create)
  router.get('/:catId/schedules', scheduleController.list)
  
  // Rotas de registros de alimentação
  router.post('/:catId/feeding-logs', feedingLogController.create)
  router.get('/:catId/feeding-logs', feedingLogController.list)

  return router
}

// Exports
module.exports = configureRoutes 