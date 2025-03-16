// Local Imports
const FeedingLog = require('../models/feeding_log')
const Cat = require('../models/cat')
const User = require('../models/user')

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
    const { cat_id, portion_size, notes } = req.body
    const user_id = req.user.id

    if (!cat_id || !portion_size) {
      return res.status(400).json({ error: 'ID do gato e tamanho da porção são obrigatórios' })
    }

    // Verificar se o gato existe e pertence ao domicílio do usuário
    const cat = await Cat.findById(cat_id)
    if (!cat) {
      return res.status(404).json({ error: 'Gato não encontrado' })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para registrar alimentação para este gato' })
    }

    const feedingLog = await FeedingLog.create({
      cat_id,
      user_id,
      portion_size,
      notes
    })

    // Notificar outros usuários via Socket.IO
    const roomId = `household:${req.user.householdId}`
    req.io.to(roomId).emit('feeding:created', {
      feedingLog,
      cat: {
        id: cat.id,
        name: cat.name
      },
      user: {
        id: req.user.id,
        name: req.user.name
      }
    })

    return res.status(201).json(feedingLog)
  } catch (err) {
    console.error('Erro ao criar registro de alimentação:', err)
    return res.status(500).json({ error: 'Erro ao criar registro de alimentação' })
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
    const { logId } = req.params
    const feedingLog = await FeedingLog.findById(logId)

    if (!feedingLog) {
      return res.status(404).json({ error: 'Registro de alimentação não encontrado' })
    }

    // Buscar informações do gato e usuário para enriquecer a resposta
    const cat = await Cat.findById(feedingLog.cat_id)
    const user = await User.findById(feedingLog.user_id)

    // Verificar se o usuário tem acesso ao domicílio do gato
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este registro' })
    }

    return res.json({
      ...feedingLog,
      cat: {
        id: cat.id,
        name: cat.name
      },
      user: {
        id: user.id,
        name: user.name
      }
    })
  } catch (err) {
    console.error('Erro ao buscar registro de alimentação:', err)
    return res.status(500).json({ error: 'Erro ao buscar registro de alimentação' })
  }
}

exports.listByCat = async (req, res) => {
  try {
    const { catId } = req.params
    const { limit = 20, offset = 0 } = req.query

    // Verificar se o gato existe e pertence ao domicílio do usuário
    const cat = await Cat.findById(catId)
    if (!cat) {
      return res.status(404).json({ error: 'Gato não encontrado' })
    }

    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar os registros deste gato' })
    }

    const feedingLogs = await FeedingLog.findByCat(catId, parseInt(limit), parseInt(offset))
    
    // Enriquecer os dados com informações do usuário
    const logsWithUserDetails = await Promise.all(
      feedingLogs.map(async log => {
        const user = await User.findById(log.user_id)
        return {
          ...log,
          user: {
            id: user.id,
            name: user.name
          }
        }
      })
    )

    return res.json(logsWithUserDetails)
  } catch (err) {
    console.error('Erro ao listar registros de alimentação:', err)
    return res.status(500).json({ error: 'Erro ao listar registros de alimentação' })
  }
}
