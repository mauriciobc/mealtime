import React from 'react';
import { Text, StyleSheet } from 'react-native';
import theme from '../themes';

export const Heading = ({ 
  children, 
  style, 
  color = theme.colors.textDark, 
  size = 'lg',
  weight = 'bold',
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.heading, 
        styles[`heading_${size}`], 
        styles[`weight_${weight}`], 
        { color }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export const Title = ({ 
  children, 
  style, 
  color = theme.colors.textDark, 
  size = 'md',
  weight = 'semiBold',
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.title, 
        styles[`title_${size}`], 
        styles[`weight_${weight}`], 
        { color }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export const Body = ({ 
  children, 
  style, 
  color = theme.colors.textMedium,
  size = 'md',
  weight = 'regular',
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.body, 
        styles[`body_${size}`],
        styles[`weight_${weight}`],
        { color }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export const Caption = ({ 
  children, 
  style, 
  color = theme.colors.textLight,
  size = 'sm',
  weight = 'regular',
  ...props 
}) => {
  return (
    <Text 
      style={[
        styles.caption, 
        styles[`caption_${size}`],
        styles[`weight_${weight}`],
        { color }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontFamily: theme.typography.fontFamily.base,
    color: theme.colors.textDark,
  },
  heading_xs: {
    fontSize: theme.typography.fontSizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  heading_sm: {
    fontSize: theme.typography.fontSizes.xl,
    lineHeight: theme.typography.lineHeights.xl,
  },
  heading_md: {
    fontSize: theme.typography.fontSizes.xxl,
    lineHeight: theme.typography.lineHeights.xxl,
  },
  heading_lg: {
    fontSize: theme.typography.fontSizes.xxxl,
    lineHeight: theme.typography.lineHeights.xxl,
  },
  
  title: {
    fontFamily: theme.typography.fontFamily.base,
    color: theme.colors.textDark,
  },
  title_xs: {
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  title_sm: {
    fontSize: theme.typography.fontSizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  title_md: {
    fontSize: theme.typography.fontSizes.lg,
    lineHeight: theme.typography.lineHeights.lg,
  },
  
  body: {
    fontFamily: theme.typography.fontFamily.base,
    color: theme.colors.textMedium,
  },
  body_xs: {
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: theme.typography.lineHeights.xs,
  },
  body_sm: {
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  body_md: {
    fontSize: theme.typography.fontSizes.md,
    lineHeight: theme.typography.lineHeights.md,
  },
  
  caption: {
    fontFamily: theme.typography.fontFamily.base,
    color: theme.colors.textLight,
  },
  caption_xs: {
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: theme.typography.lineHeights.xs,
  },
  caption_sm: {
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: theme.typography.lineHeights.sm,
  },
  
  weight_light: {
    fontWeight: theme.typography.fontWeights.light,
  },
  weight_regular: {
    fontWeight: theme.typography.fontWeights.regular,
  },
  weight_medium: {
    fontWeight: theme.typography.fontWeights.medium,
  },
  weight_semiBold: {
    fontWeight: theme.typography.fontWeights.semiBold,
  },
  weight_bold: {
    fontWeight: theme.typography.fontWeights.bold,
  },
});

export default {
  Heading,
  Title,
  Body,
  Caption,
}; 