import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Typography } from '../components/Typography';
import { Button } from '../components/Button';
import CatCard from '../components/CatCard';
import axios from 'axios';

const CatListScreen = ({ navigation }) => {
  const [cats, setCats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCats();
    
    // Atualizar a lista quando a tela receber foco novamente
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCats();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchCats = async () => {
    try {
      const householdId = 1; // Temporariamente fixo, deve vir do contexto do usuário
      const response = await axios.get(`/cats/${householdId}`);
      setCats(response.data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar gatos:', error);
      setIsLoading(false);
      Alert.alert('Erro', 'Não foi possível carregar a lista de gatos.');
    }
  };

  const handleCatPress = (cat) => {
    navigation.navigate('CatProfileView', { catId: cat.id });
  };

  const handleSchedulePress = (cat) => {
    navigation.navigate('ScheduleSetup', { 
      catId: cat.id,
      catName: cat.name
    });
  };

  const handleFeedPress = (cat) => {
    navigation.navigate('FeedingLogEntry', { 
      catId: cat.id,
      catName: cat.name
    });
  };

  const handleAddCat = () => {
    navigation.navigate('CatProfileCreate');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="h1">Meus Gatos</Typography>
        <Button 
          title="Adicionar" 
          onPress={handleAddCat}
          style={styles.addButton}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {cats.length === 0 ? (
          <View style={styles.emptyState}>
            <Typography variant="body" style={styles.emptyText}>
              Você ainda não adicionou nenhum gato. 
              Clique no botão "Adicionar" para começar.
            </Typography>
          </View>
        ) : (
          cats.map(cat => (
            <CatCard 
              key={cat.id} 
              cat={cat} 
              onPress={handleCatPress}
              onSchedulePress={handleSchedulePress}
              onFeedPress={handleFeedPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 100,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default CatListScreen; 