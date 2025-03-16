const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const [, token] = authHeader.split(' ');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        householdId: user.household_id,
        timezone: user.timezone,
        language: user.language
      };

      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao autenticar usuário' });
  }
};

module.exports = { authenticate }; 