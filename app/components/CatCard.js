import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from './Typography';
import { Card } from './Card';

const CatCard = ({ cat, onPress, onSchedulePress, onFeedPress }) => {
  const { id, name, photo_url, weight, restrictions } = cat;
  
  const defaultImage = require('../assets/cat-placeholder.png');
  const imageSource = photo_url ? { uri: photo_url } : defaultImage;

  return (
    <Card style={styles.container}>
      <TouchableOpacity 
        style={styles.content}
        onPress={() => onPress(cat)}
      >
        <Image 
          source={imageSource} 
          style={styles.image}
          resizeMode="cover"
        />
        
        <View style={styles.infoContainer}>
          <Typography variant="h2" style={styles.name}>{name}</Typography>
          
          {weight && (
            <Typography variant="body">
              Peso: {weight} kg
            </Typography>
          )}
          
          {restrictions && (
            <Typography variant="body" style={styles.restrictions}>
              Restrições: {restrictions}
            </Typography>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.scheduleButton]}
          onPress={() => onSchedulePress(cat)}
        >
          <Typography variant="button" style={styles.buttonText}>
            Horários
          </Typography>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.feedButton]}
          onPress={() => onFeedPress(cat)}
        >
          <Typography variant="button" style={styles.buttonText}>
            Alimentar
          </Typography>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  name: {
    marginBottom: 4,
  },
  restrictions: {
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scheduleButton: {
    borderRightWidth: 1,
    borderRightColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  feedButton: {
    backgroundColor: '#e6f7e6',
  },
  buttonText: {
    fontWeight: 'bold',
  },
});

export default CatCard; 