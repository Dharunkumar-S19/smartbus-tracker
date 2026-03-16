import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../firebase/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export default function ProfileScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    const handleLogout = async () => {
        await logout();
        navigation.navigate('Home');
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Not logged in</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                </View>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 24,
    },
    profileCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        color: '#666',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    text: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    }
});
