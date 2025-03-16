import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import axios from 'axios';

const HouseholdCreationScreen = ({ navigation }) => {
  const [householdName, setHouseholdName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para o domicílio');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/household', { name: householdName });
      setIsLoading(false);
      Alert.alert(
        'Sucesso',
        'Domicílio criado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.navigate('HouseholdInvite', { householdId: response.data.id }) }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível criar o domicílio. Tente novamente.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Typography variant="h1">Criar Domicílio</Typography>
        <Typography variant="body" style={styles.description}>
          Crie um domicílio para gerenciar a alimentação dos seus gatos com outras pessoas.
        </Typography>

        <View style={styles.inputContainer}>
          <Typography variant="label">Nome do Domicílio</Typography>
          <TextInput
            style={styles.input}
            value={householdName}
            onChangeText={setHouseholdName}
            placeholder="Ex: Casa da Família"
          />
        </View>

        <Button 
          title="Criar Domicílio" 
          onPress={handleCreateHousehold} 
          isLoading={isLoading}
          style={styles.button}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
  },
  description: {
    marginVertical: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  button: {
    marginTop: 8,
  },
});

export default HouseholdCreationScreen; 