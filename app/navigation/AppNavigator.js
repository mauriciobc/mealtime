import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DailyReflectionScreen from '../screens/DailyReflectionScreen';
import ExercisesScreen from '../screens/ExercisesScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="DailyReflection"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
          presentation: 'modal',
        }}
      >
        <Stack.Screen 
          name="DailyReflection" 
          component={DailyReflectionScreen} 
        />
        <Stack.Screen 
          name="Exercises" 
          component={ExercisesScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 