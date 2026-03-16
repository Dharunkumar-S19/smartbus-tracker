import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AuthButton = () => {
    const { user, isAuthenticated, loading } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    if (loading) {
        return <View style={styles.loadingPlaceholder} />;
    }

    if (isAuthenticated && user) {
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

        return (
            <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => navigation.navigate('Profile')}
            >
                <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
        >
            <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    loginButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    loginText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingPlaceholder: {
        width: 55,
        height: 36,
        marginRight: 10,
    }
});
