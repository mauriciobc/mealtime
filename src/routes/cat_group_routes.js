const express = require('express')
const catGroupController = require('../controllers/cat_group_controller')
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
  router.post('/', catGroupController.create)
  router.get('/', catGroupController.list)
  router.get('/:groupId', catGroupController.getDetails)
  router.put('/:groupId', catGroupController.update)
  router.delete('/:groupId', catGroupController.remove)
  
  // Rota para listar gatos de um grupo
  router.get('/:groupId/cats', catGroupController.getCats)

  return router
}

// Exports
module.exports = configureRoutes
