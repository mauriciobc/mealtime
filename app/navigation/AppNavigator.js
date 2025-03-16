import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Telas
import HouseholdCreationScreen from '../screens/HouseholdCreationScreen';
import HouseholdJoinScreen from '../screens/HouseholdJoinScreen';
import CatListScreen from '../screens/CatListScreen';
import CatProfileCreateScreen from '../screens/CatProfileCreateScreen';
import ScheduleSetupScreen from '../screens/ScheduleSetupScreen';
import FeedingLogEntryScreen from '../screens/FeedingLogEntryScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="HouseholdCreation"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0066cc',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="HouseholdCreation" 
          component={HouseholdCreationScreen} 
          options={{ title: 'Criar Domicílio' }} 
        />
        <Stack.Screen 
          name="HouseholdJoin" 
          component={HouseholdJoinScreen} 
          options={{ title: 'Entrar em Domicílio' }} 
        />
        <Stack.Screen 
          name="CatListScreen" 
          component={CatListScreen} 
          options={{ title: 'Meus Gatos' }} 
        />
        <Stack.Screen 
          name="CatProfileCreate" 
          component={CatProfileCreateScreen} 
          options={{ title: 'Adicionar Gato' }} 
        />
        <Stack.Screen 
          name="ScheduleSetup" 
          component={ScheduleSetupScreen} 
          options={{ title: 'Horários de Alimentação' }} 
        />
        <Stack.Screen 
          name="FeedingLogEntry" 
          component={FeedingLogEntryScreen} 
          options={{ title: 'Registrar Alimentação' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 