// Local Imports
const Household = require('../models/household')
const { getTimezones, getAllTimezones } = require('../utils/timezone')

// Error Handlers
const handleError = (res, err) => {
  console.error('Erro no controlador de domicílios:', err)
  return res.status(500).json({ 
    error: 'Erro ao processar requisição',
    details: err.message
  })
}

// Controller Methods
const create = async (req, res) => {
  try {
    const { name, timezone } = req.body
    const { id: adminId } = req.user

    if (!name?.trim()) {
      return res.status(400).json({ 
        error: 'Nome do domicílio é obrigatório' 
      })
    }

    const household = await Household.create({ name, adminId, timezone })
    return res.status(201).json(household)
  } catch (err) {
    return handleError(res, err)
  }
}

const getDetails = async (req, res) => {
  try {
    const { householdId } = req.params
    const household = await Household.findById(householdId)
    
    if (!household) {
      return res.status(404).json({ 
        error: 'Domicílio não encontrado' 
      })
    }

    const members = await Household.getMembers(householdId)
    return res.json({ ...household, members })
  } catch (err) {
    return handleError(res, err)
  }
}

const update = async (req, res) => {
  try {
    const { householdId } = req.params
    const { name, timezone } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ 
        error: 'Nome do domicílio é obrigatório' 
      })
    }

    const household = await Household.update(householdId, { name, timezone })
    
    if (!household) {
      return res.status(404).json({ 
        error: 'Domicílio não encontrado' 
      })
    }

    // Notifica membros sobre a atualização via Socket.IO
    req.io.to(`household:${householdId}`).emit('household:updated', household)
    
    return res.json(household)
  } catch (err) {
    return handleError(res, err)
  }
}

const join = async (req, res) => {
  try {
    const { inviteCode } = req.body
    const { id: userId } = req.user

    if (!inviteCode?.trim()) {
      return res.status(400).json({ 
        error: 'Código de convite é obrigatório' 
      })
    }

    const household = await Household.findByInviteCode(inviteCode)
    
    if (!household) {
      return res.status(404).json({ 
        error: 'Código de convite inválido' 
      })
    }

    await Household.addMember(household.id, userId)
    const updatedHousehold = await Household.findById(household.id)
    
    // Notifica membros sobre o novo membro via Socket.IO
    req.io.to(`household:${household.id}`).emit('household:member_joined', {
      householdId: household.id,
      userId
    })

    return res.json(updatedHousehold)
  } catch (err) {
    return handleError(res, err)
  }
}

const refreshInviteCode = async (req, res) => {
  try {
    const { householdId } = req.params
    const result = await Household.refreshInviteCode(householdId)
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Domicílio não encontrado' 
      })
    }

    return res.json(result)
  } catch (err) {
    return handleError(res, err)
  }
}

const updateTimezone = async (req, res) => {
  try {
    const { householdId } = req.params
    const { timezone } = req.body

    if (!timezone?.trim()) {
      return res.status(400).json({ 
        error: 'Timezone é obrigatório' 
      })
    }

    const household = await Household.updateTimezone(householdId, timezone)
    
    if (!household) {
      return res.status(404).json({ 
        error: 'Domicílio não encontrado' 
      })
    }

    // Notifica membros sobre a atualização via Socket.IO
    req.io.to(`household:${householdId}`).emit('household:timezone_updated', {
      householdId,
      timezone
    })
    
    return res.json(household)
  } catch (err) {
    return handleError(res, err)
  }
}

const listTimezones = async (req, res) => {
  try {
    const grouped = req.query.grouped === 'true'
    
    if (grouped) {
      return res.json(getTimezones())
    }
    
    return res.json(getAllTimezones())
  } catch (err) {
    return handleError(res, err)
  }
}

// Exports
module.exports = {
  create,
  getDetails,
  update,
  join,
  refreshInviteCode,
  updateTimezone,
  listTimezones
} 