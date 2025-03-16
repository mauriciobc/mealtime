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
  /**
   * Cria um novo registro de alimentação
   * @param {Object} data Dados do registro
   * @param {number} data.cat_id ID do gato
   * @param {number} data.user_id ID do usuário que alimentou
   * @param {number} data.portion_size Tamanho da porção em gramas
   * @param {string} data.notes Observações opcionais
   * @returns {Promise<Object>} Registro criado
   */
  static create(data) {
    return new Promise((resolve, reject) => {
      const { cat_id, user_id, portion_size, notes } = data;
      
      const sql = `
        INSERT INTO feeding_logs (cat_id, user_id, portion_size, notes)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [cat_id, user_id, portion_size, notes || null], function(err) {
        if (err) {
          console.error('Erro ao inserir registro de alimentação:', err);
          return reject(err);
        }
        
        FeedingLog.findById(this.lastID)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Encontra um registro de alimentação pelo ID
   * @param {number} id ID do registro
   * @returns {Promise<Object>} Registro encontrado
   */
  static findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, cat_id, user_id, portion_size, notes, created_at
        FROM feeding_logs
        WHERE id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Erro ao buscar registro de alimentação:', err);
          return reject(err);
        }
        
        if (!row) {
          return resolve(null);
        }
        
        resolve({
          id: row.id,
          cat_id: row.cat_id,
          user_id: row.user_id,
          portion_size: row.portion_size,
          notes: row.notes,
          created_at: row.created_at
        });
      });
    });
  }

  /**
   * Lista registros de alimentação de um gato específico
   * @param {number} catId ID do gato
   * @param {number} limit Limite de registros
   * @param {number} offset Offset para paginação
   * @returns {Promise<Array>} Lista de registros
   */
  static findByCat(catId, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, cat_id, user_id, portion_size, notes, created_at
        FROM feeding_logs
        WHERE cat_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      db.all(sql, [catId, limit, offset], (err, rows) => {
        if (err) {
          console.error('Erro ao listar registros de alimentação:', err);
          return reject(err);
        }
        
        resolve(rows.map(row => ({
          id: row.id,
          cat_id: row.cat_id,
          user_id: row.user_id,
          portion_size: row.portion_size,
          notes: row.notes,
          created_at: row.created_at
        })));
      });
    });
  }

  /**
   * Recupera estatísticas de alimentação para um gato
   * @param {number} catId ID do gato
   * @param {string} startDate Data inicial (YYYY-MM-DD)
   * @param {string} endDate Data final (YYYY-MM-DD)
   * @returns {Promise<Object>} Estatísticas de alimentação
   */
  static getStats(catId, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total_feedings,
          AVG(portion_size) as avg_portion,
          SUM(portion_size) as total_amount,
          MAX(created_at) as last_feeding
        FROM feeding_logs
        WHERE cat_id = ?
          AND date(created_at) BETWEEN date(?) AND date(?)
      `;
      
      db.get(sql, [catId, startDate, endDate], (err, row) => {
        if (err) {
          console.error('Erro ao buscar estatísticas de alimentação:', err);
          return reject(err);
        }
        
        resolve({
          total_feedings: row.total_feedings,
          avg_portion: row.avg_portion,
          total_amount: row.total_amount,
          last_feeding: row.last_feeding
        });
      });
    });
  }
}

module.exports = FeedingLog
