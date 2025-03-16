const express = require('express')
const router = express.Router()
const catController = require('../controllers/cat_controller')
const { authenticate } = require('../middleware/auth')

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

module.exports = router 