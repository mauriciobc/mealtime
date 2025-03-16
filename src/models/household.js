// Remote Imports
const crypto = require('crypto')

// Local Imports
const db = require('../config/database')
const { isValidTimezone } = require('../utils/timezone')

// Hoisted Variables
const INVITE_CODE_LENGTH = 8
const DEFAULT_TIMEZONE = 'UTC'

// Utility Functions
const generateInviteCode = () => 
  crypto.randomBytes(INVITE_CODE_LENGTH)
    .toString('hex')
    .slice(0, INVITE_CODE_LENGTH)

const handleDbError = err => {
  console.error('Erro no banco de dados:', err)
  throw { code: 'SQLITE_ERROR', message: err.message }
}

const validateTimezone = timezone => {
  if (!timezone) return DEFAULT_TIMEZONE
  
  if (!isValidTimezone(timezone)) {
    throw { 
      code: 'VALIDATION_ERROR', 
      message: `Timezone inválida: ${timezone}` 
    }
  }
  
  return timezone
}

// Household Model
class Household {
  static async create({ name, adminId, timezone = DEFAULT_TIMEZONE }) {
    const validatedTimezone = validateTimezone(timezone)
    const inviteCode = generateInviteCode()
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION')

        db.run(
          `INSERT INTO households (name, invite_code, timezone) VALUES (?, ?, ?)`,
          [name, inviteCode, validatedTimezone],
          function(err) {
            if (err) {
              db.run('ROLLBACK')
              return reject(handleDbError(err))
            }
            
            const householdId = this.lastID
            
            // Atualiza o usuário admin com o household_id
            db.run(
              `UPDATE users SET household_id = ?, role = 'admin' WHERE id = ?`,
              [householdId, adminId],
              err => {
                if (err) {
                  db.run('ROLLBACK')
                  return reject(handleDbError(err))
                }

                db.run('COMMIT', err => {
                  if (err) {
                    db.run('ROLLBACK')
                    return reject(handleDbError(err))
                  }

                  resolve({ 
                    id: householdId, 
                    name, 
                    inviteCode,
                    timezone: validatedTimezone,
                    adminId 
                  })
                })
              }
            )
          }
        )
      })
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

  static async update(id, { name, timezone }) {
    const updates = []
    const params = []

    if (name) {
      updates.push('name = ?')
      params.push(name)
    }

    if (timezone) {
      const validatedTimezone = validateTimezone(timezone)
      updates.push('timezone = ?')
      params.push(validatedTimezone)
    }

    if (updates.length === 0) {
      return this.findById(id)
    }

    params.push(id)

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE households SET ${updates.join(', ')} WHERE id = ?`,
        params,
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

  static async addMember(householdId, userId) {
    return new Promise((resolve, reject) => {
      // Primeiro verifica se o usuário já está em outro domicílio
      db.get(
        'SELECT household_id FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) return reject(handleDbError(err))
          
          if (user?.household_id) {
            return reject({ 
              code: 'VALIDATION_ERROR', 
              message: 'Usuário já pertence a um domicílio' 
            })
          }

          // Adiciona o usuário ao domicílio
          db.run(
            'UPDATE users SET household_id = ?, role = ? WHERE id = ?',
            [householdId, 'member', userId],
            err => err ? reject(handleDbError(err)) : resolve({ householdId, userId })
          )
        }
      )
    })
  }

  static async updateTimezone(id, timezone) {
    const validatedTimezone = validateTimezone(timezone)
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE households SET timezone = ? WHERE id = ?',
        [validatedTimezone, id],
        err => err ? reject(handleDbError(err)) : 
          this.findById(id).then(resolve).catch(reject)
      )
    })
  }
}

// Exports
module.exports = Household 