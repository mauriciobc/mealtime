// Remote Imports
const crypto = require('crypto')

// Local Imports
const db = require('../config/database')

// Hoisted Variables
const INVITE_CODE_LENGTH = 8

// Utility Functions
const generateInviteCode = () => 
  crypto.randomBytes(INVITE_CODE_LENGTH)
    .toString('hex')
    .slice(0, INVITE_CODE_LENGTH)

const handleDbError = err => {
  console.error('Erro no banco de dados:', err)
  throw { code: 'SQLITE_ERROR', message: err.message }
}

// Household Model
class Household {
  static async create({ name, adminId }) {
    const inviteCode = generateInviteCode()
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO households (name, invite_code) VALUES (?, ?)`,
        [name, inviteCode],
        function(err) {
          if (err) return reject(handleDbError(err))
          
          const householdId = this.lastID
          
          // Atualiza o usuário admin com o household_id
          db.run(
            `UPDATE users SET household_id = ?, role = 'admin' WHERE id = ?`,
            [householdId, adminId],
            err => err ? reject(handleDbError(err)) : 
              resolve({ 
                id: householdId, 
                name, 
                inviteCode,
                adminId 
              })
          )
        }
      )
    })
  }

  static async findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT h.*, 
          COUNT(DISTINCT u.id) as member_count,
          COUNT(DISTINCT c.id) as cat_count
        FROM households h
        LEFT JOIN users u ON u.household_id = h.id
        LEFT JOIN cats c ON c.household_id = h.id
        WHERE h.id = ?
        GROUP BY h.id`,
        [id],
        (err, household) => err ? reject(handleDbError(err)) : resolve(household)
      )
    })
  }

  static async findByInviteCode(inviteCode) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM households WHERE invite_code = ?',
        [inviteCode],
        (err, household) => err ? reject(handleDbError(err)) : resolve(household)
      )
    })
  }

  static async getMembers(householdId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, email, role, timezone, language 
        FROM users 
        WHERE household_id = ?`,
        [householdId],
        (err, members) => err ? reject(handleDbError(err)) : resolve(members)
      )
    })
  }

  static async update(id, { name }) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE households SET name = ? WHERE id = ?',
        [name, id],
        err => err ? reject(handleDbError(err)) : 
          this.findById(id).then(resolve).catch(reject)
      )
    })
  }

  static async refreshInviteCode(id) {
    const inviteCode = generateInviteCode()
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE households SET invite_code = ? WHERE id = ?',
        [inviteCode, id],
        err => err ? reject(handleDbError(err)) : resolve({ id, inviteCode })
      )
    })
  }
}

// Exports
module.exports = Household 