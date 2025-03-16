const express = require('express');
const AuthController = require('../controllers/auth_controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Rotas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Rotas protegidas
router.get('/profile', authenticate, AuthController.profile);
router.put('/profile', authenticate, AuthController.updateProfile);

module.exports = router; 