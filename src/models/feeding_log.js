// Local Imports
const db = require('../config/database')
const Cat = require('./cat')

// Hoisted Variables
const VALID_FIELDS = ['portion_size', 'notes']

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
  
  // Validar tamanho da porção
  if (!fields.portion_size || isNaN(fields.portion_size) || fields.portion_size <= 0) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'O tamanho da porção (portion_size) deve ser um número positivo'
    }
  }
}

// FeedingLog Model
class FeedingLog {
  static async create(catId, userId, householdId, fields) {
    validateFields(fields)
    
    // Verificar se o gato existe e pertence ao domicílio
    await Cat.findById(catId, householdId)
    
    const { portion_size, notes } = fields
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO feeding_logs (cat_id, user_id, portion_size, notes) VALUES (?, ?, ?, ?)',
        [catId, userId, portion_size, notes],
        function(err) {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          // Retorna o registro criado
          db.get(
            `SELECT fl.*, u.name as user_name
             FROM feeding_logs fl
             INNER JOIN users u ON u.id = fl.user_id
             WHERE fl.id = ?`,
            [this.lastID],
            (err, log) => {
              if (err) {
                reject(handleDbError(err))
                return
              }
              resolve(log)
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
        `SELECT fl.*, u.name as user_name
         FROM feeding_logs fl
         INNER JOIN users u ON u.id = fl.user_id
         INNER JOIN cats c ON c.id = fl.cat_id
         WHERE fl.cat_id = ? AND c.household_id = ?
         ORDER BY fl.created_at DESC`,
        [catId, householdId],
        (err, logs) => err ? reject(handleDbError(err)) : resolve(logs)
      )
    })
  }
  
  static async findById(id, householdId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT fl.*, u.name as user_name
         FROM feeding_logs fl
         INNER JOIN users u ON u.id = fl.user_id
         INNER JOIN cats c ON c.id = fl.cat_id
         WHERE fl.id = ? AND c.household_id = ?`,
        [id, householdId],
        (err, log) => {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          if (!log) {
            reject({ code: 'NOT_FOUND', message: 'Registro de alimentação não encontrado' })
            return
          }
          
          resolve(log)
        }
      )
    })
  }
}

module.exports = FeedingLog
