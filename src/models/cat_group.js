// Local Imports
const db = require('../config/database')

// Hoisted Variables
const VALID_FIELDS = ['name']

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
}

// CatGroup Model
class CatGroup {
  static async create(householdId, fields) {
    validateFields(fields)
    
    const { name } = fields
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO cat_groups (name, household_id) VALUES (?, ?)',
        [name, householdId],
        function(err) {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          // Retorna o grupo criado
          db.get(
            'SELECT * FROM cat_groups WHERE id = ?',
            [this.lastID],
            (err, group) => {
              if (err) {
                reject(handleDbError(err))
                return
              }
              resolve(group)
            }
          )
        }
      )
    })
  }
  
  static async findAll(householdId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM cat_groups WHERE household_id = ? ORDER BY name',
        [householdId],
        (err, groups) => err ? reject(handleDbError(err)) : resolve(groups)
      )
    })
  }
  
  static async findById(id, householdId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM cat_groups WHERE id = ? AND household_id = ?',
        [id, householdId],
        (err, group) => {
          if (err) {
            reject(handleDbError(err))
            return
          }
          
          if (!group) {
            reject({ code: 'NOT_FOUND', message: 'Grupo não encontrado' })
            return
          }
          
          resolve(group)
        }
      )
    })
  }
  
  static async update(id, householdId, fields) {
    validateFields(fields)
    
    const { name } = fields
    
    return new Promise((resolve, reject) => {
      // Verificar se o grupo existe
      this.findById(id, householdId)
        .then(() => {
          // Atualizar o grupo
          db.run(
            'UPDATE cat_groups SET name = ? WHERE id = ? AND household_id = ?',
            [name, id, householdId],
            err => {
              if (err) {
                reject(handleDbError(err))
                return
              }
              
              // Retornar o grupo atualizado
              this.findById(id, householdId)
                .then(group => resolve(group))
                .catch(error => reject(error))
            }
          )
        })
        .catch(error => reject(error))
    })
  }
  
  static async delete(id, householdId) {
    return new Promise((resolve, reject) => {
      // Verificar se o grupo existe
      this.findById(id, householdId)
        .then(() => {
          // Primeiro remover as associações com gatos
          db.run(
            'DELETE FROM cat_group_members WHERE group_id = ?',
            [id],
            err => {
              if (err) {
                reject(handleDbError(err))
                return
              }
              
              // Depois excluir o grupo
              db.run(
                'DELETE FROM cat_groups WHERE id = ? AND household_id = ?',
                [id, householdId],
                err => err ? reject(handleDbError(err)) : resolve({ id, deleted: true })
              )
            }
          )
        })
        .catch(error => reject(error))
    })
  }
  
  static async findCats(groupId, householdId) {
    return new Promise((resolve, reject) => {
      // Verificar se o grupo existe
      this.findById(groupId, householdId)
        .then(() => {
          // Buscar gatos do grupo
          db.all(
            `SELECT c.* FROM cats c
             INNER JOIN cat_group_members cgm ON cgm.cat_id = c.id
             WHERE cgm.group_id = ? AND c.household_id = ?
             ORDER BY c.name`,
            [groupId, householdId],
            (err, cats) => err ? reject(handleDbError(err)) : resolve(cats)
          )
        })
        .catch(error => reject(error))
    })
  }
}

module.exports = CatGroup
