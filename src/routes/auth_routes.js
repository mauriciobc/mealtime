const express = require('express');
const AuthController = require('../controllers/auth_controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Rotas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Rotas protegidas
router.get('/profile', auth, AuthController.profile);
router.put('/profile', auth, AuthController.updateProfile);

module.exports = router; 