import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import axios from 'axios';
import PhotoUploader from '../components/PhotoUploader';

const CatProfileCreateScreen = ({ navigation }) => {
  const [catData, setCatData] = useState({
    name: '',
    birthdate: '',
    weight: '',
    restrictions: '',
    notes: ''
  });
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setCatData({
      ...catData,
      [field]: value
    });
  };

  const handleCreateCatProfile = async () => {
    if (!catData.name.trim()) {
      Alert.alert('Erro', 'O nome do gato é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Adiciona dados do gato
      Object.keys(catData).forEach(key => {
        formData.append(key, catData[key]);
      });
      
      // Adiciona foto se existir
      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: 'cat_photo.jpg',
        });
      }

      await axios.post('/cats', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setIsLoading(false);
      Alert.alert(
        'Sucesso',
        'Perfil do gato criado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.navigate('CatListScreen') }]
      );
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível criar o perfil do gato. Tente novamente.');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Typography variant="h1">Adicionar Gato</Typography>
          
          <PhotoUploader onPhotoSelected={setPhoto} />

          <View style={styles.inputContainer}>
            <Typography variant="label">Nome do Gato*</Typography>
            <TextInput
              style={styles.input}
              value={catData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Ex: Mingau"
            />
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="label">Data de Nascimento</Typography>
            <TextInput
              style={styles.input}
              value={catData.birthdate}
              onChangeText={(value) => handleInputChange('birthdate', value)}
              placeholder="DD/MM/AAAA"
            />
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="label">Peso (kg)</Typography>
            <TextInput
              style={styles.input}
              value={catData.weight}
              onChangeText={(value) => handleInputChange('weight', value)}
              placeholder="Ex: 4.5"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="label">Restrições Alimentares</Typography>
            <TextInput
              style={styles.input}
              value={catData.restrictions}
              onChangeText={(value) => handleInputChange('restrictions', value)}
              placeholder="Ex: Alergia a frutos do mar"
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Typography variant="label">Observações</Typography>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={catData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder="Informações adicionais sobre seu gato"
              multiline
              numberOfLines={4}
            />
          </View>

          <Button 
            title="Criar Perfil" 
            onPress={handleCreateCatProfile} 
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
    marginBottom: 20,
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
    marginTop: 16,
  },
});

export default CatProfileCreateScreen; 