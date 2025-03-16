const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      const user = await User.create({ name, email, password });
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      });
    } catch (err) {
      console.error('Erro ao registrar usuário:', err);
      return res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          household_id: user.household_id,
          timezone: user.timezone,
          language: user.language
        },
        token
      });
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      return res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  static async profile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        household_id: user.household_id,
        timezone: user.timezone,
        language: user.language
      });
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      return res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, timezone, language } = req.body;
      const updatedUser = await User.updateProfile(req.user.id, { name, timezone, language });
      return res.json(updatedUser);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      return res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  }
}

module.exports = AuthController; 