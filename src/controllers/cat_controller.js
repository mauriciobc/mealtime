// Local Imports
const Cat = require('../models/cat')

// Error Handlers
const handleError = (res, err) => {
  console.error('Erro no controlador de gatos:', err)
  return res.status(500).json({ 
    error: 'Erro ao processar requisição',
    details: err.message
  })
}

// Controller Methods
const create = async (req, res) => {
  try {
    const { householdId } = req.user
    const fields = req.body

    if (!householdId) {
      return res.status(400).json({ 
        error: 'Usuário não pertence a nenhum domicílio' 
      })
    }

    if (!fields?.name?.trim()) {
      return res.status(400).json({ 
        error: 'Nome do gato é obrigatório' 
      })
    }

    const cat = await Cat.create(householdId, fields)
    
    // Notifica membros sobre o novo gato via Socket.IO
    req.io.to(`household:${householdId}`).emit('cat:created', cat)
    
    return res.status(201).json(cat)
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: err.message })
    }
    return handleError(res, err)
  }
}

const list = async (req, res) => {
  try {
    const { householdId } = req.user

    if (!householdId) {
      return res.status(400).json({ 
        error: 'Usuário não pertence a nenhum domicílio' 
      })
    }

    const cats = await Cat.findByHousehold(householdId)
    return res.json(cats)
  } catch (err) {
    return handleError(res, err)
  }
}

const getDetails = async (req, res) => {
  try {
    const { catId } = req.params
    const cat = await Cat.findById(catId)
    
    if (!cat) {
      return res.status(404).json({ 
        error: 'Gato não encontrado' 
      })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      })
    }

    return res.json(cat)
  } catch (err) {
    return handleError(res, err)
  }
}

const update = async (req, res) => {
  try {
    const { catId } = req.params
    const fields = req.body
    
    const cat = await Cat.findById(catId)
    
    if (!cat) {
      return res.status(404).json({ 
        error: 'Gato não encontrado' 
      })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      })
    }

    const updatedCat = await Cat.update(catId, fields)
    
    // Notifica membros sobre a atualização via Socket.IO
    req.io.to(`household:${cat.household_id}`).emit('cat:updated', updatedCat)
    
    return res.json(updatedCat)
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: err.message })
    }
    return handleError(res, err)
  }
}

const remove = async (req, res) => {
  try {
    const { catId } = req.params
    const cat = await Cat.findById(catId)
    
    if (!cat) {
      return res.status(404).json({ 
        error: 'Gato não encontrado' 
      })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      })
    }

    await Cat.delete(catId)
    
    // Notifica membros sobre a remoção via Socket.IO
    req.io.to(`household:${cat.household_id}`).emit('cat:deleted', { id: catId })
    
    return res.json({ id: catId })
  } catch (err) {
    return handleError(res, err)
  }
}

const addToGroup = async (req, res) => {
  try {
    const { catId, groupId } = req.params
    const cat = await Cat.findById(catId)
    
    if (!cat) {
      return res.status(404).json({ 
        error: 'Gato não encontrado' 
      })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      })
    }

    await Cat.addToGroup(catId, groupId)
    
    // Notifica membros sobre a adição ao grupo via Socket.IO
    req.io.to(`household:${cat.household_id}`).emit('cat:group_added', { 
      catId, 
      groupId 
    })
    
    return res.json({ catId, groupId })
  } catch (err) {
    return handleError(res, err)
  }
}

const removeFromGroup = async (req, res) => {
  try {
    const { catId, groupId } = req.params
    const cat = await Cat.findById(catId)
    
    if (!cat) {
      return res.status(404).json({ 
        error: 'Gato não encontrado' 
      })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ 
        error: 'Acesso negado' 
      })
    }

    await Cat.removeFromGroup(catId, groupId)
    
    // Notifica membros sobre a remoção do grupo via Socket.IO
    req.io.to(`household:${cat.household_id}`).emit('cat:group_removed', { 
      catId, 
      groupId 
    })
    
    return res.json({ catId, groupId })
  } catch (err) {
    return handleError(res, err)
  }
}

// Exports
module.exports = {
  create,
  list,
  getDetails,
  update,
  remove,
  addToGroup,
  removeFromGroup
} 