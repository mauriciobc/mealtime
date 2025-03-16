// Local Imports
const CatGroup = require('../models/cat_group')

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
    
    const group = await CatGroup.create(householdId, req.body)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('cat-group-created', group)
    }
    
    res.status(201).json(group)
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
    
    const groups = await CatGroup.findAll(householdId)
    res.json(groups)
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
    
    const groupId = req.params.groupId
    const group = await CatGroup.findById(groupId, householdId)
    res.json(group)
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
    
    const groupId = req.params.groupId
    const group = await CatGroup.update(groupId, householdId, req.body)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('cat-group-updated', group)
    }
    
    res.json(group)
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
    
    const groupId = req.params.groupId
    const result = await CatGroup.delete(groupId, householdId)
    
    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.to(`household:${householdId}`).emit('cat-group-deleted', { id: groupId })
    }
    
    res.json(result)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getCats = async (req, res) => {
  try {
    const householdId = req.user.household_id
    
    if (!householdId) {
      return res.status(400).json({ error: 'Usuário não pertence a um domicílio' })
    }
    
    const groupId = req.params.groupId
    const cats = await CatGroup.findCats(groupId, householdId)
    res.json(cats)
  } catch (error) {
    handleError(res, error)
  }
}
