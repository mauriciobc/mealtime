import React from 'react';
import { TouchableOpacity, StyleSheet, View, ActivityIndicator } from 'react-native';
import { motion } from 'framer-motion';
import { Body } from './Typography';
import theme from '../themes';

const Button = ({
  title,
  onPress,
  style,
  textStyle,
  variant = 'primary', // primary, secondary, text
  size = 'md', // sm, md, lg
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const MotionTouchable = motion(TouchableOpacity);
  
  const getButtonStyles = () => {
    const buttonStyles = [styles.button, styles[`button_${variant}`], styles[`button_${size}`]];
    
    if (disabled) {
      buttonStyles.push(styles.button_disabled);
    }
    
    return buttonStyles;
  };
  
  const getTextStyles = () => {
    const textStyles = [styles.text, styles[`text_${variant}`], styles[`text_${size}`]];
    
    if (disabled) {
      textStyles.push(styles.text_disabled);
    }
    
    return textStyles;
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          color={variant === 'primary' ? theme.colors.buttonText : theme.colors.button} 
          size="small"
        />
      );
    }
    
    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>{icon}</View>
        )}
        
        <Body 
          style={[getTextStyles(), textStyle]} 
          weight="medium"
        >
          {title}
        </Body>
        
        {icon && iconPosition === 'right' && (
          <View style={styles.iconRight}>{icon}</View>
        )}
      </View>
    );
  };
  
  return (
    <MotionTouchable
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      {...props}
    >
      {renderContent()}
    </MotionTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: {
    backgroundColor: theme.colors.button,
  },
  button_secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.button,
  },
  button_text: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  button_sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  button_md: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  button_lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  button_disabled: {
    opacity: 0.5,
  },
  
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  text: {
    textAlign: 'center',
  },
  text_primary: {
    color: theme.colors.buttonText,
  },
  text_secondary: {
    color: theme.colors.button,
  },
  text_text: {
    color: theme.colors.button,
  },
  text_sm: {
    fontSize: theme.typography.fontSizes.sm,
  },
  text_md: {
    fontSize: theme.typography.fontSizes.md,
  },
  text_lg: {
    fontSize: theme.typography.fontSizes.lg,
  },
  text_disabled: {
    opacity: 0.7,
  },
  
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
});

export default Button; 