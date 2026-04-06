import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import BusListScreen from '../screens/BusListScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DriverLoginScreen from '../screens/DriverLoginScreen';
import DriverDashboard from '../screens/DriverDashboard';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName="Home">
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="BusList"
                component={BusListScreen}
                options={{ title: 'Bus Routes' }}
            />
            <Stack.Screen
                name="LiveTracking"
                component={LiveTrackingScreen}
                options={{ title: 'Live Tracking' }}
            />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
            <Stack.Screen name="DriverLogin" component={DriverLoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'My Profile' }}
            />
            <Stack.Screen
                name="DriverDashboard"
                component={DriverDashboard}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}
