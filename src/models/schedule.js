// Local Imports
const db = require('../config/database')
const Cat = require('./cat')
const moment = require('moment-timezone')

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
  /**
   * Cria um novo agendamento para um gato
   * @param {Object} data Dados do agendamento
   * @param {number} data.cat_id ID do gato
   * @param {string} data.type Tipo de agendamento ('fixed' ou 'interval')
   * @param {number} data.interval_minutes Intervalo em minutos (para tipo 'interval')
   * @param {string} data.times Horários fixos em formato JSON (para tipo 'fixed')
   * @returns {Promise<Object>} Agendamento criado
   */
  static create(data) {
    return new Promise((resolve, reject) => {
      const { cat_id, type, interval_minutes, times } = data;
      
      // Validações
      if (!cat_id) {
        return reject(new Error('ID do gato é obrigatório'));
      }
      
      if (!type || !['fixed', 'interval'].includes(type)) {
        return reject(new Error('Tipo de agendamento deve ser "fixed" ou "interval"'));
      }
      
      if (type === 'interval' && !interval_minutes) {
        return reject(new Error('Intervalo em minutos é obrigatório para agendamentos do tipo "interval"'));
      }
      
      if (type === 'fixed' && (!times || !Array.isArray(JSON.parse(times)))) {
        return reject(new Error('Lista de horários é obrigatória para agendamentos do tipo "fixed"'));
      }
      
      const sql = `
        INSERT INTO schedules (cat_id, type, interval_minutes, times)
        VALUES (?, ?, ?, ?)
      `;
      
      const timesValue = type === 'fixed' ? times : null;
      const intervalValue = type === 'interval' ? interval_minutes : null;
      
      db.run(sql, [cat_id, type, intervalValue, timesValue], function(err) {
        if (err) {
          console.error('Erro ao criar agendamento:', err);
          return reject(err);
        }
        
        Schedule.findById(this.lastID)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Encontra um agendamento pelo ID
   * @param {number} id ID do agendamento
   * @returns {Promise<Object>} Agendamento encontrado
   */
  static findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, cat_id, type, interval_minutes, times, override_until, created_at
        FROM schedules
        WHERE id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Erro ao buscar agendamento:', err);
          return reject(err);
        }
        
        if (!row) {
          return resolve(null);
        }
        
        try {
          // Converter JSON de horários para array se existir
          const times = row.times ? JSON.parse(row.times) : null;
          
          resolve({
            id: row.id,
            cat_id: row.cat_id,
            type: row.type,
            interval_minutes: row.interval_minutes,
            times: times,
            override_until: row.override_until,
            created_at: row.created_at
          });
        } catch (err) {
          console.error('Erro ao processar dados do agendamento:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * Encontra agendamentos para um gato específico
   * @param {number} catId ID do gato
   * @returns {Promise<Array>} Lista de agendamentos
   */
  static findByCat(catId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, cat_id, type, interval_minutes, times, override_until, created_at
        FROM schedules
        WHERE cat_id = ?
      `;
      
      db.all(sql, [catId], (err, rows) => {
        if (err) {
          console.error('Erro ao listar agendamentos do gato:', err);
          return reject(err);
        }
        
        try {
          const schedules = rows.map(row => ({
            id: row.id,
            cat_id: row.cat_id,
            type: row.type,
            interval_minutes: row.interval_minutes,
            times: row.times ? JSON.parse(row.times) : null,
            override_until: row.override_until,
            created_at: row.created_at
          }));
          
          resolve(schedules);
        } catch (err) {
          console.error('Erro ao processar dados dos agendamentos:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * Atualiza um agendamento existente
   * @param {number} id ID do agendamento
   * @param {Object} data Dados para atualização
   * @returns {Promise<Object>} Agendamento atualizado
   */
  static update(id, data) {
    return new Promise((resolve, reject) => {
      const updates = [];
      const params = [];
      
      if (data.type) {
        if (!['fixed', 'interval'].includes(data.type)) {
          return reject(new Error('Tipo de agendamento deve ser "fixed" ou "interval"'));
        }
        updates.push('type = ?');
        params.push(data.type);
      }
      
      if (data.interval_minutes !== undefined) {
        updates.push('interval_minutes = ?');
        params.push(data.interval_minutes);
      }
      
      if (data.times !== undefined) {
        // Validar se é um JSON válido para tipo 'fixed'
        try {
          if (data.type === 'fixed' && (!data.times || !Array.isArray(JSON.parse(data.times)))) {
            return reject(new Error('Lista de horários é obrigatória para agendamentos do tipo "fixed"'));
          }
        } catch (err) {
          return reject(new Error('Formato de horários inválido'));
        }
        
        updates.push('times = ?');
        params.push(data.times);
      }
      
      if (data.override_until !== undefined) {
        updates.push('override_until = ?');
        params.push(data.override_until);
      }
      
      if (updates.length === 0) {
        return resolve(null);
      }
      
      const sql = `
        UPDATE schedules
        SET ${updates.join(', ')}
        WHERE id = ?
      `;
      
      params.push(id);
      
      db.run(sql, params, function(err) {
        if (err) {
          console.error('Erro ao atualizar agendamento:', err);
          return reject(err);
        }
        
        if (this.changes === 0) {
          return resolve(null);
        }
        
        Schedule.findById(id)
          .then(resolve)
          .catch(reject);
      });
    });
  }

  /**
   * Remove um agendamento
   * @param {number} id ID do agendamento
   * @returns {Promise<boolean>} True se removido com sucesso
   */
  static remove(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM schedules WHERE id = ?';
      
      db.run(sql, [id], function(err) {
        if (err) {
          console.error('Erro ao remover agendamento:', err);
          return reject(err);
        }
        
        resolve(this.changes > 0);
      });
    });
  }

  /**
   * Calcula o próximo horário de alimentação para um gato
   * @param {number} catId ID do gato
   * @param {string} timezone Fuso horário para cálculo
   * @returns {Promise<Object>} Informações do próximo horário
   */
  static getNextFeeding(catId, timezone = 'UTC') {
    return new Promise(async (resolve, reject) => {
      try {
        const schedules = await Schedule.findByCat(catId);
        
        if (!schedules || schedules.length === 0) {
          return resolve(null);
        }
        
        const now = moment().tz(timezone);
        let nextFeeding = null;
        let nextTime = null;
        
        for (const schedule of schedules) {
          // Verificar se há um override ativo
          if (schedule.override_until && moment(schedule.override_until).isAfter(now)) {
            // Lógica de override do agendamento
            continue;
          }
          
          if (schedule.type === 'interval' && schedule.interval_minutes) {
            // Calcular próxima alimentação baseada em intervalo
            const lastFeeding = await Schedule.getLastFeeding(catId);
            
            if (!lastFeeding) {
              // Se não houver alimentação anterior, agendar para agora
              nextTime = now;
            } else {
              const lastTime = moment(lastFeeding.created_at).tz(timezone);
              nextTime = lastTime.add(schedule.interval_minutes, 'minutes');
            }
          } else if (schedule.type === 'fixed' && schedule.times) {
            // Calcular próxima alimentação baseada em horários fixos
            const times = schedule.times;
            
            for (const timeStr of times) {
              const [hour, minute] = timeStr.split(':').map(Number);
              let timeToday = moment().tz(timezone).set({ hour, minute, second: 0 });
              
              // Se o horário já passou hoje, considerar para amanhã
              if (timeToday.isBefore(now)) {
                timeToday = timeToday.add(1, 'day');
              }
              
              if (!nextTime || timeToday.isBefore(nextTime)) {
                nextTime = timeToday;
                nextFeeding = {
                  schedule_id: schedule.id,
                  cat_id: schedule.cat_id,
                  scheduled_for: nextTime.format(),
                  type: 'fixed',
                  time: timeStr
                };
              }
            }
          }
        }
        
        resolve(nextFeeding);
      } catch (err) {
        console.error('Erro ao calcular próxima alimentação:', err);
        reject(err);
      }
    });
  }

  /**
   * Recupera a última alimentação registrada para um gato
   * @param {number} catId ID do gato
   * @returns {Promise<Object>} Último registro de alimentação
   */
  static getLastFeeding(catId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM feeding_logs
        WHERE cat_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      db.get(sql, [catId], (err, row) => {
        if (err) {
          console.error('Erro ao buscar última alimentação:', err);
          return reject(err);
        }
        
        resolve(row || null);
      });
    });
  }
}

module.exports = Schedule
