// Local Imports
const Schedule = require('../models/schedule')
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
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const catId = req.params.catId
    
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    const schedule = await Schedule.create(catId, householdId, req.body)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('schedule-created', schedule)
    }
    
    res.status(201).json(schedule)
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
    
    const schedules = await Schedule.findAllByCat(catId, householdId)
    res.json(schedules)
  } catch (error) {
    handleError(res, error)
  }
}

exports.update = async (req, res) => {
  try {
    const householdId = req.user.household_id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const scheduleId = req.params.scheduleId
    const schedule = await Schedule.update(scheduleId, householdId, req.body)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('schedule-updated', schedule)
    }
    
    res.json(schedule)
  } catch (error) {
    handleError(res, error)
  }
}

exports.remove = async (req, res) => {
  try {
    const householdId = req.user.household_id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const scheduleId = req.params.scheduleId
    const result = await Schedule.delete(scheduleId, householdId)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('schedule-deleted', { id: scheduleId })
    }
    
    res.json(result)
  } catch (error) {
    handleError(res, error)
  }
}
