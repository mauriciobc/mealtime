// Local Imports
const db = require('../config/database')

// Hoisted Variables
const VALID_FIELDS = ['name', 'photo_url', 'birthdate', 'weight', 'restrictions', 'notes']

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

// Cat Model
class Cat {
  static async create(householdId, fields) {
    validateFields(fields)
    
    const { name, photo_url, birthdate, weight, restrictions, notes } = fields
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO cats (
          name, photo_url, birthdate, weight, restrictions, notes, household_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, photo_url, birthdate, weight, restrictions, notes, householdId],
        function(err) {
          if (err) return reject(handleDbError(err))
          
          this.findById(this.lastID)
            .then(resolve)
            .catch(reject)
        }
      )
    })
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, h.name as household_name 
        FROM cats c
        LEFT JOIN households h ON h.id = c.household_id
        WHERE c.id = ?`,
        [id],
        (err, cat) => err ? reject(handleDbError(err)) : resolve(cat)
      )
    })
  }

  static async findByHousehold(householdId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM cats WHERE household_id = ? ORDER BY name',
        [householdId],
        (err, cats) => err ? reject(handleDbError(err)) : resolve(cats)
      )
    })
  }

  static async update(id, fields) {
    validateFields(fields)
    
    const updates = Object.entries(fields)
      .map(([key, _]) => `${key} = ?`)
      .join(', ')
    
    const values = [...Object.values(fields), id]
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE cats SET ${updates} WHERE id = ?`,
        values,
        err => err ? reject(handleDbError(err)) : 
          this.findById(id).then(resolve).catch(reject)
      )
    })
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM cats WHERE id = ?',
        [id],
        err => err ? reject(handleDbError(err)) : resolve({ id })
      )
    })
  }

  static async findByGroup(groupId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.* 
        FROM cats c
        INNER JOIN cat_group_members cgm ON cgm.cat_id = c.id
        WHERE cgm.group_id = ?
        ORDER BY c.name`,
        [groupId],
        (err, cats) => err ? reject(handleDbError(err)) : resolve(cats)
      )
    })
  }

  static async addToGroup(catId, groupId) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO cat_group_members (cat_id, group_id) VALUES (?, ?)',
        [catId, groupId],
        err => err ? reject(handleDbError(err)) : resolve({ catId, groupId })
      )
    })
  }

  static async removeFromGroup(catId, groupId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM cat_group_members WHERE cat_id = ? AND group_id = ?',
        [catId, groupId],
        err => err ? reject(handleDbError(err)) : resolve({ catId, groupId })
      )
    })
  }
}

// Exports
module.exports = Cat 