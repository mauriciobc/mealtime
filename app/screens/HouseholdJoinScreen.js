import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import axios from 'axios';

const HouseholdJoinScreen = ({ navigation }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código de convite');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/household/join', { inviteCode });
      setIsLoading(false);
      Alert.alert(
        'Sucesso',
        'Você entrou no domicílio com sucesso!',
        [{ text: 'OK', onPress: () => navigation.navigate('CatListScreen') }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Código de convite inválido ou expirado. Tente novamente.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Typography variant="h1">Entrar em um Domicílio</Typography>
        <Typography variant="body" style={styles.description}>
          Insira o código de convite fornecido pelo administrador do domicílio.
        </Typography>

        <View style={styles.inputContainer}>
          <Typography variant="label">Código de Convite</Typography>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="Insira o código de convite"
            autoCapitalize="none"
          />
        </View>

        <Button 
          title="Entrar no Domicílio" 
          onPress={handleJoinHousehold} 
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

export default HouseholdJoinScreen; 