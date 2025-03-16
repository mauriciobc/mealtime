require('dotenv').config();

// Remote Imports
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Local Imports
const db = require('./config/database');
const authRoutes = require('./routes/auth_routes');
const configureHouseholdRoutes = require('./routes/household_routes');
const configureCatRoutes = require('./routes/cat_routes');

// Hoisted Variables and References
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const NODE_ENV = process.env.NODE_ENV || 'development';

const errorTypes = {
  VALIDATION: 'ValidationError',
  UNAUTHORIZED: 'UnauthorizedError',
  DATABASE: 'SQLITE_ERROR'
};

// App Setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Middleware Setup
app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// Configuração de codificação
app.use((req, res, next) => {
  res.charset = 'utf-8';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Força a codificação da resposta para UTF-8
  if (res.json) {
    const original = res.json;
    res.json = function (...args) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return original.apply(res, args);
    };
  }
  
  next();
});

// Middleware de tratamento de erros de JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      details: 'A requisição contém JSON inválido. Verifique o formato dos dados.',
      debug: NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/households', configureHouseholdRoutes(io));
app.use('/api/cats', configureCatRoutes(io));

// Base Routes
app.get('/', (_, res) => 
  res.json({ 
    message: 'MealTime API',
    version: '1.0.0',
    status: 'online',
    environment: NODE_ENV
  })
);

// Socket Event Handlers
const handleSocketConnection = socket => {
  const { id } = socket;
  console.info(`Cliente conectado: ${id}`);

  const joinHousehold = householdId => {
    const roomId = `household:${householdId}`;
    socket.join(roomId);
    console.info(`Cliente ${id} entrou no domicílio ${householdId}`);
  };

  const leaveHousehold = householdId => {
    const roomId = `household:${householdId}`;
    socket.leave(roomId);
    console.info(`Cliente ${id} saiu do domicílio ${householdId}`);
  };

  const handleDisconnect = () => console.info(`Cliente desconectado: ${id}`);

  // Socket Event Bindings
  socket.on('disconnect', handleDisconnect);
  socket.on('join:household', joinHousehold);
  socket.on('leave:household', leaveHousehold);
};

// Socket.IO Setup
io.on('connection', handleSocketConnection);

// Error Handlers
const handleValidationError = (res, err) => 
  res.status(400).json({ 
    error: 'Erro de validação',
    details: err.message 
  });

const handleUnauthorizedError = (res, err) => 
  res.status(401).json({ 
    error: 'Não autorizado',
    details: err.message 
  });

const handleDatabaseError = res => 
  res.status(500).json({ 
    error: 'Erro no banco de dados',
    details: 'Ocorreu um erro ao acessar o banco de dados' 
  });

const handleGenericError = (res, err) => 
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado'
  });

// Error Middleware
app.use((err, _, res, next) => {
  console.error('Erro não tratado:', err);

  switch(err.name || err.code) {
    case errorTypes.VALIDATION:
      return handleValidationError(res, err);
    case errorTypes.UNAUTHORIZED:
      return handleUnauthorizedError(res, err);
    case errorTypes.DATABASE:
      return handleDatabaseError(res);
    default:
      return handleGenericError(res, err);
  }
});

// 404 Handler
app.use((req, res) => 
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path
  })
);

// Server Startup
server.listen(PORT, () => {
  console.info(`Servidor rodando na porta ${PORT}`);
  console.info(`Ambiente: ${NODE_ENV}`);
}); 