import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { motion } from 'framer-motion';
import theme from '../themes';

const Card = ({ 
  children, 
  style, 
  backgroundColor = theme.colors.cardBackground,
  onPress,
  ...props 
}) => {
  const MotionView = motion(TouchableOpacity);
  
  return (
    <MotionView
      style={[styles.card, { backgroundColor }, style]}
      whileTap={{ scale: onPress ? 0.98 : 1 }}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
      {...props}
    >
      {children}
    </MotionView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: theme.colors.cardBackground,
  },
});

export default Card; 