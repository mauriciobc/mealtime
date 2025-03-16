import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import axios from 'axios';

// Configuração base do axios
axios.defaults.baseURL = 'http://localhost:3000'; // Substituir pelo URL correto da API em produção

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App; 