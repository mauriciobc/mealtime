import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { motion } from 'framer-motion';
import { Heading, Title, Body, Caption } from '../components/Typography';
import Card from '../components/Card';
import MoodSelector from '../components/MoodSelector';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import theme from '../themes';

const DailyReflectionScreen = ({ navigation }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [reflection, setReflection] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(89);
  
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
            title="⚬"
            variant="text"
            onPress={() => {}}
            style={styles.settingsButton}
          />
        </View>
        
        <View style={styles.contentContainer}>
          <Caption>Reflexão Diária</Caption>
          
          <MotionView
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Heading style={styles.greeting}>
              Olá, Max <Body style={styles.emoji}>🌿</Body>
            </Heading>
            
            <Title style={styles.question}>
              Como você está se sentindo sobre suas{' '}
              <Title style={{ color: theme.colors.textDark }}>
                emoções atuais
              </Title>?
            </Title>
          </MotionView>
          
          <Card style={styles.reflectionCard}>
            <TextInput
              style={styles.reflectionInput}
              placeholder="Sua reflexão..."
              placeholderTextColor={theme.colors.textLight}
              multiline
              value={reflection}
              onChangeText={setReflection}
            />
            
            <Button
              title="→"
              variant="text"
              onPress={() => {}}
              style={styles.submitButton}
            />
          </Card>
          
          <View style={styles.moodLogContainer}>
            <View style={styles.sectionHeader}>
              <Title size="sm">Registro de Humor Diário</Title>
              <Button
                title="⋮"
                variant="text"
                onPress={() => {}}
                style={styles.moreButton}
              />
            </View>
            
            <MoodSelector
              selectedMood={selectedMood}
              onSelectMood={setSelectedMood}
            />
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.sectionHeader}>
              <Title size="sm">Seu progresso</Title>
              <Button
                title="⋮"
                variant="text"
                onPress={() => {}}
                style={styles.moreButton}
              />
            </View>
            
            <ProgressBar 
              progress={progressPercentage} 
              label="Do plano semanal completado"
            />
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
  settingsButton: {
    height: 36,
    width: 36,
    borderRadius: theme.borderRadius.circle,
    backgroundColor: theme.colors.secondary,
    padding: 0,
  },
  contentContainer: {
    flex: 1,
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  emoji: {
    fontSize: theme.typography.fontSizes.xl,
  },
  question: {
    marginBottom: theme.spacing.lg,
    color: theme.colors.textMedium,
  },
  reflectionCard: {
    marginBottom: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reflectionInput: {
    flex: 1,
    padding: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.textDark,
    minHeight: 30,
  },
  submitButton: {
    height: 36,
    width: 36,
    borderRadius: theme.borderRadius.circle,
    padding: 0,
  },
  moodLogContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  moreButton: {
    height: 24,
    width: 24,
    borderRadius: theme.borderRadius.circle,
    padding: 0,
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
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

export default DailyReflectionScreen; 