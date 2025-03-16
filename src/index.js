require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./config/database');
const authRoutes = require('./routes/auth_routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);

// Rota básica
app.get('/', (req, res) => {
  res.json({ 
    message: 'MealTime API',
    version: '1.0.0',
    status: 'online'
  });
});

// Socket.IO eventos
io.on('connection', (socket) => {
  console.info(`Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.info(`Cliente desconectado: ${socket.id}`);
  });

  // Evento para juntar-se a uma sala de domicílio
  socket.on('join:household', (householdId) => {
    socket.join(`household:${householdId}`);
    console.info(`Cliente ${socket.id} entrou no domicílio ${householdId}`);
  });

  // Evento para sair de uma sala de domicílio
  socket.on('leave:household', (householdId) => {
    socket.leave(`household:${householdId}`);
    console.info(`Cliente ${socket.id} saiu do domicílio ${householdId}`);
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  // Erros de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Erro de validação',
      details: err.message 
    });
  }

  // Erros de autenticação
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Não autorizado',
      details: err.message 
    });
  }

  // Erros do banco de dados
  if (err.code === 'SQLITE_ERROR') {
    return res.status(500).json({ 
      error: 'Erro no banco de dados',
      details: 'Ocorreu um erro ao acessar o banco de dados' 
    });
  }

  // Erro genérico
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.info(`Servidor rodando na porta ${PORT}`);
  console.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
}); 