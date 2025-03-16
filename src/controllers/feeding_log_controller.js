// Local Imports
const FeedingLog = require('../models/feeding_log')
const Cat = require('../models/cat')

// Utility Functions
const handleError = (res, error) => {
  console.error('Erro:', error)
  
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return res.status(400).json({ error: error.message })
    case 'NOT_FOUND':
      return res.status(404).json({ error: error.message })
    case 'SQLITE_ERROR':
      return res.status(500).json({ error: 'Erro no banco de dados' })
    default:
      return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Controller Methods
exports.create = async (req, res) => {
  try {
    const householdId = req.user.household_id
    const userId = req.user.id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const catId = req.params.catId
    
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    const log = await FeedingLog.create(catId, userId, householdId, req.body)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('feeding-log-created', log)
    }
    
    res.status(201).json(log)
  } catch (error) {
    handleError(res, error)
  }
}

exports.list = async (req, res) => {
  try {
    const householdId = req.user.household_id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const catId = req.params.catId
    
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    const logs = await FeedingLog.findAllByCat(catId, householdId)
    res.json(logs)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getDetails = async (req, res) => {
  try {
    const householdId = req.user.household_id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const logId = req.params.logId
    const log = await FeedingLog.findById(logId, householdId)
    res.json(log)
  } catch (error) {
    handleError(res, error)
  }
}
