// Local Imports
const db = require('../config/database')
const Cat = require('./cat')

// Hoisted Variables
const VALID_FIELDS = ['type', 'interval_minutes', 'times', 'override_until']
const VALID_TYPES = ['fixed', 'interval']

// Utility Functions
const handleDbError = err => {
  console.error('Erro no banco de dados:', err)
  throw { code: 'SQLITE_ERROR', message: err.message }
}

const validateFields = fields => {
  const invalidFields = Object.keys(fields).filter(field => !VALID_FIELDS.includes(field))
  if (invalidFields.length > 0) {
    throw { 
      code: 'VALIDATION_ERROR',
      message: `Campos inválidos: ${invalidFields.join(', ')}`
    }
  }
  
  // Validar tipo de agendamento
  if (fields.type && !VALID_TYPES.includes(fields.type)) {
    throw {
      code: 'VALIDATION_ERROR',
      message: `Tipo de agendamento inválido: ${fields.type}. Tipos válidos: ${VALID_TYPES.join(', ')}`
    }
  }
  
  // Validar campos específicos por tipo
  if (fields.type === 'fixed' && (!fields.times || !Array.isArray(fields.times) || fields.times.length === 0)) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Para agendamentos fixos, é necessário informar os horários (times)'
    }
  }
  
  if (fields.type === 'interval' && (!fields.interval_minutes || isNaN(fields.interval_minutes) || fields.interval_minutes <= 0)) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Para agendamentos por intervalo, é necessário informar o intervalo em minutos (interval_minutes)'
    }
  }
}

const parseTimes = times => {
  if (!times) return null
  
  if (Array.isArray(times)) {
    return JSON.stringify(times)
  }
  
  return times
}

const formatSchedule = schedule => {
  if (!schedule) return null
  
  try {
    return {
      ...schedule,
      times: schedule.times ? JSON.parse(schedule.times) : null
    }
  } catch (e) {
    console.error('Erro ao converter horários:', e)
    return schedule
  }
}

// Schedule Model
class Schedule {
  static async create(catId, householdId, fields) {
    validateFields(fields)
    
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    const { type, interval_minutes, times, override_until } = fields
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO schedules (cat_id, type, interval_minutes, times, override_until) VALUES (?, ?, ?, ?, ?)',
        [catId, type, interval_minutes, parseTimes(times), override_until],
        function(err) {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          // Retorna o agendamento criado
          db.get(
            'SELECT * FROM schedules WHERE id = ?',
            [this.lastID],
            (err, schedule) => {
              if (err) {
                reject(handleDbError(err))
                return
              }
              resolve(formatSchedule(schedule))
            }
          )
        }
      )
    })
  }
  
  static async findAllByCat(catId, householdId) {
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT s.* FROM schedules s
         INNER JOIN cats c ON c.id = s.cat_id
         WHERE s.cat_id = ? AND c.household_id = ?
         ORDER BY s.id`,
        [catId, householdId],
        (err, schedules) => {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          // Formatar todos os agendamentos
          const formattedSchedules = schedules.map(formatSchedule)
          resolve(formattedSchedules)
        }
      )
    })
  }
  
  static async findById(id, householdId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT s.* FROM schedules s
         INNER JOIN cats c ON c.id = s.cat_id
         WHERE s.id = ? AND c.household_id = ?`,
        [id, householdId],
        (err, schedule) => {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          if (!schedule) {
            reject({ code: 'NOT_FOUND', message: 'Agendamento não encontrado' })
            return
          }
          
          resolve(formatSchedule(schedule))
        }
      )
    })
  }
  
  static async update(id, householdId, fields) {
    validateFields(fields)
    
    // Verificar se o agendamento existe
    const existingSchedule = await this.findById(id, householdId)
    
    // Preparar os campos para atualização
    const updateFields = {}
    const params = []
    const allowedFields = ['type', 'interval_minutes', 'times', 'override_until']
    
    allowedFields.forEach(field => {
      if (field in fields) {
        let value = fields[field]
        
        // Tratar campos especiais
        if (field === 'times') {
          value = parseTimes(value)
        }
        
        updateFields[field] = value
        params.push(value)
      }
    })
    
    // Se não houver campos para atualizar, retornar o agendamento existente
    if (Object.keys(updateFields).length === 0) {
      return existingSchedule
    }
    
    // Construir a query de atualização
    const setClause = Object.keys(updateFields)
      .map(field => `${field} = ?`)
      .join(', ')
    
    // Adicionar id e householdId aos parâmetros
    params.push(id)
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE schedules SET ${setClause} 
         WHERE id = ?`,
        params,
        err => {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          // Retornar o agendamento atualizado
          this.findById(id, householdId)
            .then(schedule => resolve(schedule))
            .catch(error => reject(error))
        }
      )
    })
  }
  
  static async delete(id, householdId) {
    // Verificar se o agendamento existe
    await this.findById(id, householdId)
    
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM schedules WHERE id = ?',
        [id],
        err => err ? reject(handleDbError(err)) : resolve({ id, deleted: true })
      )
    })
  }
}

module.exports = Schedule
