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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loginWithEmail, getUserProfile, getCurrentUser } from '../firebase/auth';

type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<LoginRouteProp>();
    const isDriverMode = route.params?.isDriver || false;

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
                const { profile, error: profileError } = await getUserProfile(user.uid, isDriverMode ? 'driver' : 'passenger');
                setLoading(false);
                if (profileError) {
                    setError(profileError);
                } else if (profile?.role === 'driver') {
                    navigation.replace('DriverDashboard');
                } else if (profile?.role === 'admin') {
                    navigation.replace('AdminDashboard');
                } else {
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
            <View style={styles.formContainer}>
                <Text style={styles.title}>{isDriverMode ? 'Driver Portal' : 'Welcome Back'}</Text>
                <Text style={styles.subtitle}>
                    {isDriverMode ? 'Log in to start your trip' : 'Login to SmartBusTracker'}
                </Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
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
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                {!isDriverMode && (
                    <View style={styles.footerLinks}>
                        <TouchableOpacity
                            style={styles.linkContainer}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.linkText}>Don't have an account? Register</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.linkContainer, { marginTop: 16 }]}
                            onPress={() => navigation.navigate('DriverLogin')}
                        >
                            <Text style={styles.driverLinkText}>Login as Driver</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isDriverMode && (
                    <TouchableOpacity
                        style={styles.linkContainer}
                        onPress={() => navigation.replace('Login', { isDriver: false })}
                    >
                        <Text style={styles.linkText}>Are you a passenger? Login here</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        height: 54,
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footerLinks: {
        marginTop: 24,
        alignItems: 'center',
    },
    linkContainer: {
        alignItems: 'center',
    },
    linkText: {
        color: '#007AFF',
        fontSize: 14,
    },
    driverLinkText: {
        color: '#8e8e93',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    errorText: {
        color: '#FF3B30',
        marginBottom: 16,
        textAlign: 'center',
    }
});
