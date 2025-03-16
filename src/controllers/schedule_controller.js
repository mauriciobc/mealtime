// Local Imports
const Schedule = require('../models/schedule')
const Cat = require('../models/cat')

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
    const { cat_id, type, interval_minutes, times } = req.body;
    
    if (!cat_id) {
      return res.status(400).json({ error: 'ID do gato é obrigatório' });
    }
    
    // Verificar se o gato existe e pertence ao domicílio do usuário
    const cat = await Cat.findById(cat_id);
    if (!cat) {
      return res.status(404).json({ error: 'Gato não encontrado' });
    }
    
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para criar agendamentos para este gato' });
    }
    
    // Preparar dados do agendamento
    const scheduleData = { cat_id, type };
    
    if (type === 'interval') {
      scheduleData.interval_minutes = interval_minutes;
    } else if (type === 'fixed') {
      // Converter para JSON string se for um array
      scheduleData.times = Array.isArray(times) ? JSON.stringify(times) : times;
    }
    
    const schedule = await Schedule.create(scheduleData);
    
    // Notificar via Socket.IO
    const roomId = `household:${req.user.householdId}`;
    req.io.to(roomId).emit('schedule:created', {
      schedule,
      cat: {
        id: cat.id,
        name: cat.name
      }
    });
    
    return res.status(201).json(schedule);
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao criar agendamento', details: err.message });
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
    
    const schedules = await Schedule.findAllByCat(catId, householdId)
    res.json(schedules)
  } catch (error) {
    handleError(res, error)
  }
}

exports.getDetails = async (req, res) => {
  try {
    const { scheduleId } = req.params
    
    // Buscar agendamento
    const schedule = await Schedule.findById(scheduleId)
    
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }
    
    // Verificar se o gato pertence ao domicílio do usuário
    const cat = await Cat.findById(schedule.cat_id)
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este agendamento' })
    }
    
    return res.json(schedule)
  } catch (err) {
    console.error('Erro ao buscar detalhes do agendamento:', err)
    return res.status(500).json({ error: 'Erro ao buscar detalhes do agendamento' })
  }
}

exports.listByCat = async (req, res) => {
  try {
    const { catId } = req.params
    
    // Verificar se o gato existe e pertence ao domicílio do usuário
    const cat = await Cat.findById(catId)
    if (!cat) {
      return res.status(404).json({ error: 'Gato não encontrado' })
    }
    
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar os agendamentos deste gato' })
    }
    
    const schedules = await Schedule.findByCat(catId)
    return res.json(schedules)
  } catch (err) {
    console.error('Erro ao listar agendamentos do gato:', err)
    return res.status(500).json({ error: 'Erro ao listar agendamentos do gato' })
  }
}

exports.update = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { type, interval_minutes, times, override_until } = req.body;
    
    // Buscar agendamento existente
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    // Verificar se o gato pertence ao domicílio do usuário
    const cat = await Cat.findById(schedule.cat_id);
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para modificar este agendamento' });
    }
    
    // Preparar dados para atualização
    const updateData = {};
    
    if (type) updateData.type = type;
    if (interval_minutes !== undefined) updateData.interval_minutes = interval_minutes;
    
    if (times !== undefined) {
      updateData.times = Array.isArray(times) ? JSON.stringify(times) : times;
    }
    
    if (override_until !== undefined) {
      updateData.override_until = override_until;
    }
    
    const updatedSchedule = await Schedule.update(scheduleId, updateData);
    
    if (!updatedSchedule) {
      return res.status(400).json({ error: 'Nenhuma alteração realizada' });
    }
    
    // Notificar via Socket.IO
    const roomId = `household:${req.user.householdId}`;
    req.io.to(roomId).emit('schedule:updated', {
      schedule: updatedSchedule,
      cat: {
        id: cat.id,
        name: cat.name
      }
    });
    
    return res.json(updatedSchedule);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    return res.status(500).json({ error: 'Erro ao atualizar agendamento', details: err.message });
  }
}

exports.remove = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Buscar agendamento existente
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    // Verificar se o gato pertence ao domicílio do usuário
    const cat = await Cat.findById(schedule.cat_id);
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para remover este agendamento' });
    }
    
    const result = await Schedule.remove(scheduleId);
    
    if (!result) {
      return res.status(400).json({ error: 'Falha ao remover agendamento' });
    }
    
    // Notificar via Socket.IO
    const roomId = `household:${req.user.householdId}`;
    req.io.to(roomId).emit('schedule:removed', {
      schedule_id: scheduleId,
      cat_id: schedule.cat_id
    });
    
    return res.status(200).json({ message: 'Agendamento removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover agendamento:', err);
    return res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
}

exports.getNextFeeding = async (req, res) => {
  try {
    const { catId } = req.params;
    
    // Verificar se o gato existe e pertence ao domicílio do usuário
    const cat = await Cat.findById(catId);
    if (!cat) {
      return res.status(404).json({ error: 'Gato não encontrado' });
    }
    
    if (cat.household_id !== req.user.householdId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar agendamentos deste gato' });
    }
    
    const nextFeeding = await Schedule.getNextFeeding(catId, req.user.timezone || 'UTC');
    
    if (!nextFeeding) {
      return res.json({ has_upcoming: false });
    }
    
    return res.json({
      has_upcoming: true,
      ...nextFeeding
    });
  } catch (err) {
    console.error('Erro ao calcular próxima alimentação:', err);
    return res.status(500).json({ error: 'Erro ao calcular próxima alimentação' });
  }
}
