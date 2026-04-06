import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { loginWithEmail, getUserProfile, getCurrentUser } from '../firebase/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverLogin'>;

export default function DriverLoginScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        const { error: loginError } = await loginWithEmail(email, password);

        if (loginError) {
            setLoading(false);
            setError(loginError);
        } else {
            // Get user profile to determine role
            const user = getCurrentUser();
            if (user) {
                const { profile, error: profileError } = await getUserProfile(user.uid, 'driver');
                setLoading(false);
                if (profileError) {
                    setError(profileError);
                } else if (profile?.role === 'driver') {
                    navigation.replace('DriverDashboard');
                } else {
                    // If a passenger tries to login through driver portal, redirect appropriately
                    navigation.replace('Home');
                }
            } else {
                setLoading(false);
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.navigate('Login')}
            >
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.formContainer}>
                <View style={styles.iconContainer}>
                    <Ionicons name="bus" size={60} color="#007AFF" />
                </View>
                
                <Text style={styles.title}>Driver Portal</Text>
                <Text style={styles.subtitle}>Enter your transport credentials to begin</Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TextInput
                    style={styles.input}
                    placeholder="Mail ID"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Authenticate & Start Trip</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Need access? Contact your Admin</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fbfc',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
    backText: {
        color: '#007AFF',
        fontSize: 16,
        marginLeft: 4,
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e1e8ed',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#FF3B30',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        color: '#8e8e93',
        fontSize: 14,
    },
});
