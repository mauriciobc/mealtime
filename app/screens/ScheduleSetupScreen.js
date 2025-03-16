import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const ScheduleSetupScreen = ({ route, navigation }) => {
  const { catId, catName } = route.params || { catId: null, catName: 'Gato' };
  const [schedules, setSchedules] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (catId) {
      fetchSchedules();
    }
  }, [catId]);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`/schedules/${catId}`);
      if (response.data && response.data.length) {
        // Converte as strings de tempo para objetos Date
        const formattedSchedules = response.data.map(schedule => ({
          ...schedule,
          times: schedule.times.split(',').map(time => {
            const [hours, minutes] = time.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date;
          })
        }));
        setSchedules(formattedSchedules);
      } else {
        // Cria um horário padrão se não houver nenhum
        setSchedules([{ type: 'daily', interval: 1, times: [new Date()] }]);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      // Cria um horário padrão mesmo em caso de erro
      setSchedules([{ type: 'daily', interval: 1, times: [new Date()] }]);
    }
  };

  const addScheduleTime = (scheduleIndex) => {
    const newSchedules = [...schedules];
    const newDate = new Date();
    
    // Adiciona 2 horas ao último horário ou usa o horário atual
    if (newSchedules[scheduleIndex].times.length > 0) {
      const lastTime = new Date(newSchedules[scheduleIndex].times[newSchedules[scheduleIndex].times.length - 1]);
      newDate.setHours(lastTime.getHours() + 2);
      newDate.setMinutes(lastTime.getMinutes());
    }
    
    newSchedules[scheduleIndex].times.push(newDate);
    setSchedules(newSchedules);
  };

  const removeScheduleTime = (scheduleIndex, timeIndex) => {
    const newSchedules = [...schedules];
    if (newSchedules[scheduleIndex].times.length > 1) {
      newSchedules[scheduleIndex].times.splice(timeIndex, 1);
      setSchedules(newSchedules);
    } else {
      Alert.alert('Aviso', 'É necessário pelo menos um horário de alimentação.');
    }
  };

  const openTimePicker = (scheduleIndex, timeIndex) => {
    setSelectedIndex({ scheduleIndex, timeIndex });
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    
    if (selectedTime && selectedIndex) {
      const { scheduleIndex, timeIndex } = selectedIndex;
      const newSchedules = [...schedules];
      newSchedules[scheduleIndex].times[timeIndex] = selectedTime;
      setSchedules(newSchedules);
    }
  };

  const saveSchedules = async () => {
    if (!catId) {
      Alert.alert('Erro', 'ID do gato não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      // Formatando os horários para string antes de enviar
      const formattedSchedules = schedules.map(schedule => ({
        ...schedule,
        times: schedule.times.map(time => 
          `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
        ).join(',')
      }));

      await axios.post('/schedules', {
        catId,
        schedules: formattedSchedules
      });
      
      setIsLoading(false);
      Alert.alert(
        'Sucesso',
        'Horários de alimentação salvos com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível salvar os horários. Tente novamente.');
      console.error(error);
    }
  };

  const formatTimeString = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Typography variant="h1">Horários de Alimentação</Typography>
          <Typography variant="body" style={styles.description}>
            Configure os horários para alimentar {catName}
          </Typography>

          {schedules.map((schedule, scheduleIndex) => (
            <View key={scheduleIndex} style={styles.scheduleContainer}>
              <Typography variant="h2">Alimentações Diárias</Typography>
              
              {schedule.times.map((time, timeIndex) => (
                <View key={timeIndex} style={styles.timeRow}>
                  <TouchableOpacity 
                    style={styles.timeButton} 
                    onPress={() => openTimePicker(scheduleIndex, timeIndex)}
                  >
                    <Typography variant="body">{formatTimeString(time)}</Typography>
                  </TouchableOpacity>
                  
                  <Button 
                    title="Remover" 
                    variant="secondary"
                    onPress={() => removeScheduleTime(scheduleIndex, timeIndex)}
                    style={styles.actionButton}
                  />
                </View>
              ))}
              
              <Button 
                title="Adicionar Horário" 
                variant="secondary"
                onPress={() => addScheduleTime(scheduleIndex)}
                style={styles.addButton}
              />
            </View>
          ))}

          <Button 
            title="Salvar Horários" 
            onPress={saveSchedules} 
            isLoading={isLoading}
            style={styles.saveButton}
          />
        </Card>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={selectedIndex ? schedules[selectedIndex.scheduleIndex].times[selectedIndex.timeIndex] : new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  description: {
    marginVertical: 16,
  },
  scheduleContainer: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButton: {
    width: 100,
  },
  addButton: {
    marginTop: 8,
  },
  saveButton: {
    marginTop: 24,
  },
});

export default ScheduleSetupScreen; 