import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { motion } from 'framer-motion';
import { Caption } from './Typography';
import theme from '../themes';

// Ícones de humor (podem ser substituídos por imagens/componentes SVG reais)
const MoodIcons = {
  happy: '😊',
  calm: '😌',
  sad: '😔',
  excited: '😃',
  neutral: '😐',
  worried: '😟',
};

const MoodButton = ({ mood, isSelected, onPress }) => {
  const MotionTouchable = motion(TouchableOpacity);
  
  const getMoodColor = () => {
    switch (mood) {
      case 'happy': return theme.colors.happy;
      case 'calm': return theme.colors.calm;
      case 'sad': return theme.colors.sad;
      case 'excited': return theme.colors.happy;
      case 'neutral': return theme.colors.neutral;
      case 'worried': return theme.colors.sad;
      default: return theme.colors.neutral;
    }
  };
  
  return (
    <MotionTouchable
      style={[
        styles.moodButton,
        { backgroundColor: getMoodColor() },
        isSelected && styles.moodButtonSelected
      ]}
      whileTap={{ scale: 0.95 }}
      onPress={() => onPress(mood)}
      activeOpacity={0.8}
    >
      <Caption style={styles.moodIcon}>{MoodIcons[mood]}</Caption>
    </MotionTouchable>
  );
};

const MoodSelector = ({ selectedMood, onSelectMood }) => {
  return (
    <View style={styles.container}>
      <View style={styles.moodRow}>
        <MoodButton
          mood="happy"
          isSelected={selectedMood === 'happy'}
          onPress={onSelectMood}
        />
        <MoodButton
          mood="calm"
          isSelected={selectedMood === 'calm'}
          onPress={onSelectMood}
        />
        <MoodButton
          mood="sad"
          isSelected={selectedMood === 'sad'}
          onPress={onSelectMood}
        />
      </View>
      <View style={styles.moodRow}>
        <MoodButton
          mood="excited"
          isSelected={selectedMood === 'excited'}
          onPress={onSelectMood}
        />
        <MoodButton
          mood="neutral"
          isSelected={selectedMood === 'neutral'}
          onPress={onSelectMood}
        />
        <MoodButton
          mood="worried"
          isSelected={selectedMood === 'worried'}
          onPress={onSelectMood}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.circle,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
  },
  moodButtonSelected: {
    borderWidth: 2,
    borderColor: theme.colors.textDark,
  },
  moodIcon: {
    fontSize: 24,
  },
});

export default MoodSelector; 