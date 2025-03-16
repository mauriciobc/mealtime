import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { motion } from 'framer-motion';
import { Title, Body, Caption } from '../components/Typography';
import Card from '../components/Card';
import Button from '../components/Button';
import theme from '../themes';

const categories = [
  {
    id: '1',
    title: 'Minhas Forças & Qualidades',
    backgroundColor: theme.colors.secondary,
    icon: '→',
  },
  {
    id: '2',
    title: 'Construir Confiança',
    backgroundColor: theme.colors.happy,
    icon: '🌱',
  },
  {
    id: '3',
    title: 'Diversidade & Inclusão',
    backgroundColor: '#bcd9d1', // Cor esverdeada clara
    icon: '⎋',
  },
  {
    id: '4',
    title: 'Ativação Comportamental',
    backgroundColor: '#e9e9e9', // Cinza claro
    icon: '→',
  },
  {
    id: '5',
    title: 'Mental Fitness',
    backgroundColor: '#ffffff', // Branco
    icon: '⎋',
  },
];

const ExerciseCard = ({ item, onPress }) => {
  const MotionCard = motion(Card);
  
  return (
    <MotionCard
      style={[
        styles.exerciseCard,
        { backgroundColor: item.backgroundColor }
      ]}
      onPress={onPress}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <View style={styles.exerciseContent}>
        <Title size="sm" style={styles.exerciseTitle}>
          {item.title}
        </Title>
        
        <Button
          title={item.icon}
          variant="text"
          onPress={onPress}
          style={styles.iconButton}
        />
      </View>
    </MotionCard>
  );
};

const ExercisesScreen = ({ navigation }) => {
  const MotionView = motion(View);
  
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <MotionView 
            style={styles.logo}
            whileTap={{ scale: 0.95 }}
          >
            <Caption style={styles.logoText}>◆</Caption>
          </MotionView>
          
          <Button
            title="⚭"
            variant="text"
            onPress={() => {}}
            style={styles.searchButton}
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Caption>Práticas</Caption>
          
          <MotionView
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Title style={styles.sectionTitle}>
              Exercícios baseados em{' '}
              <Title style={{ color: theme.colors.textDark }}>
                suas necessidades
              </Title>
            </Title>
          </MotionView>
          
          <View style={styles.exercisesGrid}>
            {categories.map((item) => (
              <ExerciseCard
                key={item.id}
                item={item}
                onPress={() => {
                  // Navegação para detalhes do exercício
                }}
              />
            ))}
          </View>
        </View>
        
        <View style={styles.navigation}>
          <Button
            title="⌂"
            variant="text"
            onPress={() => {}}
            style={styles.navButton}
          />
          
          <Button
            title="≡"
            variant="text"
            onPress={() => {}}
            style={styles.navButton}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.circle,
    backgroundColor: theme.colors.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: theme.colors.buttonText,
    fontSize: 16,
  },
  searchButton: {
    height: 36,
    width: 36,
    borderRadius: theme.borderRadius.circle,
    backgroundColor: theme.colors.cardBackground,
    padding: 0,
  },
  contentContainer: {
    flex: 1,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSizes.xxl,
    color: theme.colors.textMedium,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exerciseCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
    height: 150,
    padding: theme.spacing.md,
  },
  exerciseContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    marginBottom: theme.spacing.md,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: theme.borderRadius.circle,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 0,
    alignSelf: 'flex-end',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.button,
    borderRadius: theme.borderRadius.pill,
    padding: theme.spacing.xs,
    width: 120,
    alignSelf: 'center',
  },
  navButton: {
    height: 40,
    width: 40,
    borderRadius: theme.borderRadius.circle,
    padding: 0,
    margin: theme.spacing.xs,
    color: theme.colors.buttonText,
  },
});

export default ExercisesScreen; 