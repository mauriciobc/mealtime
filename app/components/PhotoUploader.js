import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Typography } from './Typography';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const PhotoUploader = ({ onPhotoSelected, initialPhoto = null }) => {
  const [photo, setPhoto] = useState(initialPhoto);

  const openImagePicker = () => {
    Alert.alert(
      'Adicionar Foto',
      'Escolha uma opção',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tirar Foto', onPress: takePicture },
        { text: 'Escolher da Galeria', onPress: selectFromGallery },
      ]
    );
  };

  const takePicture = () => {
    launchCamera({
      mediaType: 'photo',
      quality: 0.8,
    }, handleImageResponse);
  };

  const selectFromGallery = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    }, handleImageResponse);
  };

  const handleImageResponse = (response) => {
    if (response.didCancel) {
      return;
    }
    
    if (response.errorCode) {
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar a imagem');
      return;
    }
    
    const selectedPhoto = response.assets[0];
    setPhoto(selectedPhoto);
    onPhotoSelected(selectedPhoto);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.photoContainer} 
        onPress={openImagePicker}
      >
        {photo ? (
          <Image
            source={{ uri: photo.uri }}
            style={styles.photo}
          />
        ) : (
          <View style={styles.placeholder}>
            <Typography variant="body">Toque para adicionar foto</Typography>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  photoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 75,
  },
});

export default PhotoUploader; 