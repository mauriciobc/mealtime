import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import axios from 'axios';

const FeedingLogEntryScreen = ({ route, navigation }) => {
  const { catId, catName } = route.params || { catId: null, catName: 'Gato' };
  
  const [portionSize, setPortionSize] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogFeeding = async () => {
    if (!catId) {
      Alert.alert('Erro', 'ID do gato não encontrado');
      return;
    }

    if (!portionSize.trim()) {
      Alert.alert('Aviso', 'Por favor, informe a quantidade');
      return;
    }

    setIsLoading(true);
    try {
      const userId = 1; // Temporariamente fixo, deve vir do contexto do usuário
      const timestamp = new Date().toISOString();

      await axios.post('/feedings', {
        catId,
        userId,
        timestamp,
        portionSize: parseFloat(portionSize),
        notes
      });
      
      setIsLoading(false);
      Alert.alert(
        'Sucesso',
        `Alimentação de ${catName} registrada com sucesso!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível registrar a alimentação. Tente novamente.');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Typography variant="h1">Registrar Alimentação</Typography>
          
          <Typography variant="h2" style={styles.catName}>
            {catName}
          </Typography>
          
          <Typography variant="body" style={styles.timeInfo}>
            {new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </Typography>

          <View style={styles.inputContainer}>
            <Typography variant="label">Quantidade (g)*</Typography>
            <TextInput
              style={styles.input}
              value={portionSize}
              onChangeText={setPortionSize}
              placeholder="Ex: 100"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="label">Observações</Typography>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Ex: Comeu tudo com apetite"
              multiline
              numberOfLines={4}
            />
          </View>

          <Button 
            title="Registrar Alimentação" 
            onPress={handleLogFeeding} 
            isLoading={isLoading}
            style={styles.button}
          />
        </Card>
      </View>
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
  },
  catName: {
    marginTop: 16,
  },
  timeInfo: {
    marginTop: 8,
    marginBottom: 24,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: 24,
  },
});

export default FeedingLogEntryScreen; 