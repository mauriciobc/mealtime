import React from 'react';
import { View, StyleSheet } from 'react-native';
import { motion } from 'framer-motion';
import { Body, Caption } from './Typography';
import theme from '../themes';

const ProgressBar = ({
  progress = 0, // valor de 0 a 100
  showPercentage = true,
  height = 12,
  backgroundColor = theme.colors.border,
  progressColor = theme.colors.success,
  style,
  label,
  ...props
}) => {
  // Certificar que o progresso está limitado entre 0 e 100
  const clampedProgress = Math.min(Math.max(0, progress), 100);
  
  const MotionView = motion(View);
  
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Caption style={styles.label}>{label}</Caption>
      )}
      
      <View 
        style={[
          styles.progressBarContainer, 
          { backgroundColor, height }
        ]}
        {...props}
      >
        <MotionView 
          style={[
            styles.progressBar,
            { 
              backgroundColor: progressColor,
              width: `${clampedProgress}%`,
            }
          ]}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </View>
      
      {showPercentage && (
        <Body style={styles.percentage} size="lg" weight="bold">
          {`${Math.round(clampedProgress)}%`}
        </Body>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  progressBarContainer: {
    borderRadius: theme.borderRadius.pill,
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  percentage: {
    marginTop: theme.spacing.xs,
    textAlign: 'right',
  },
});

export default ProgressBar; 