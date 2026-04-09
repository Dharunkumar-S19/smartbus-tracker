import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, query, where, count } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RootStackParamList } from '../types';
import { logout, getCurrentUser, getUserProfile } from '../firebase/auth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function AdminDashboard() {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        buses: 0,
        drivers: 0,
        activeTrips: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const busesSnap = await getDocs(collection(db, 'buses'));
                const driversSnap = await getDocs(collection(db, 'drivers'));
                
                // For active trips, we could check the realtime database or a status field
                // For now, let's just count buses with status 'on_time' or 'delayed'
                let active = 0;
                busesSnap.forEach(doc => {
                    const status = doc.data().status;
                    if (status === 'on_time' || status === 'delayed') active++;
                });

                setStats({
                    buses: busesSnap.size,
                    drivers: driversSnap.size,
                    activeTrips: active
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigation.replace('Login');
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>System Overview</Text>
                    <Text style={styles.headerTitle}>Admin Portal</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="bus" size={24} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{stats.buses}</Text>
                        <Text style={styles.statLabel}>Total Buses</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                            <Feather name="users" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.drivers}</Text>
                        <Text style={styles.statLabel}>Active Drivers</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                            <MaterialCommunityIcons name="map-marker-path" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.activeTrips}</Text>
                        <Text style={styles.statLabel}>Live Trips</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Management Modules</Text>

                {/* Management Options */}
                <TouchableOpacity 
                    style={styles.moduleBtn}
                    // @ts-ignore
                    onPress={() => navigation.navigate('DriverManager')}
                >
                    <View style={[styles.moduleIcon, { backgroundColor: '#007AFF' }]}>
                        <Feather name="user-plus" size={24} color="#fff" />
                    </View>
                    <View style={styles.moduleTextContainer}>
                        <Text style={styles.moduleTitle}>Driver Management</Text>
                        <Text style={styles.moduleSubtitle}>Create, update and assign drivers to buses</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.moduleBtn}>
                    <View style={[styles.moduleIcon, { backgroundColor: '#5856D6' }]}>
                        <Ionicons name="git-network-outline" size={24} color="#fff" />
                    </View>
                    <View style={styles.moduleTextContainer}>
                        <Text style={styles.moduleTitle}>Route Optimization</Text>
                        <Text style={styles.moduleSubtitle}>Manage bus stops and path polylines</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.moduleBtn}>
                    <View style={[styles.moduleIcon, { backgroundColor: '#FF9500' }]}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </View>
                    <View style={styles.moduleTextContainer}>
                        <Text style={styles.moduleTitle}>Broadcasting</Text>
                        <Text style={styles.moduleSubtitle}>Send alerts to all passengers or drivers</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>

                <View style={styles.serverStatusCard}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusIndicator} />
                        <Text style={styles.statusText}>Backend Server: Running</Text>
                    </View>
                    <Text style={styles.versionText}>v1.2.0 - Production Environment</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    logoutBtn: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
    },
    scrollContent: {
        padding: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statCard: {
        width: '31%',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 10,
        color: '#8E8E93',
        marginTop: 2,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 15,
    },
    moduleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    moduleIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    moduleTextContainer: {
        flex: 1,
    },
    moduleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    moduleSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
    },
    serverStatusCard: {
        marginTop: 20,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#34C759',
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    versionText: {
        fontSize: 12,
        color: '#8E8E93',
    },
});
