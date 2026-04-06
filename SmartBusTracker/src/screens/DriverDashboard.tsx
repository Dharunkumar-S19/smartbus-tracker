import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
    SafeAreaView,
    Switch,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { RootStackParamList, Bus, StopInfo } from '../types';
import { LocationSharingService } from '../services/locationSharingService';
import { logout, getCurrentUser, getUserProfile } from '../firebase/auth';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DriverDashboard'>;

export default function DriverDashboard() {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [busData, setBusData] = useState<Bus | null>(null);
    const [routeStops, setRouteStops] = useState<any[]>([]);
    const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            const user = getCurrentUser();
            if (!user) {
                navigation.replace('Login');
                return;
            }

            const { profile } = await getUserProfile(user.uid);
            setUserProfile(profile);

            // Fetch available buses (for selection if not assigned)
            try {
                const querySnapshot = await getDocs(collection(db, 'buses'));
                const busesList: Bus[] = [];
                querySnapshot.forEach((doc) => {
                    busesList.push({ id: doc.id, ...doc.data() } as Bus);
                });
                setAvailableBuses(busesList);
                
                if (profile?.assignedBusId) {
                    setSelectedBusId(profile.assignedBusId);
                }
            } catch (error) {
                console.error("Error fetching buses:", error);
            }

            setLoading(false);
        };

        loadInitialData();
    }, []);

    // Listen to real-time updates for the selected bus
    useEffect(() => {
        if (!selectedBusId) return;

        const unsub = onSnapshot(doc(db, 'buses', selectedBusId), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Bus;
                setBusData({ ...data, id: doc.id });
                if (data.stops) {
                    setRouteStops(data.stops);
                }
            }
        });

        return () => unsub();
    }, [selectedBusId]);

    const handleToggleSharing = async (value: boolean) => {
        if (value) {
            if (!selectedBusId) {
                Alert.alert("Error", "Please select a bus first");
                return;
            }

            const { success, error } = await LocationSharingService.requestPermissions();
            if (!success) {
                Alert.alert("Permission Required", error);
                return;
            }

            await LocationSharingService.startTracking(selectedBusId);
            setIsSharing(true);
            
            // Update bus status to "on_time" or "arriving" when trip starts
            if (selectedBusId) {
                await updateDoc(doc(db, 'buses', selectedBusId), {
                    status: 'on_time'
                });
            }
        } else {
            await LocationSharingService.stopTracking();
            setIsSharing(false);
        }
    };

    const updatePassengers = async (delta: number) => {
        if (!selectedBusId || !busData) return;
        
        const newCount = Math.max(0, Math.min(busData.totalCapacity, (busData.currentPassengers || 0) + delta));
        
        try {
            await updateDoc(doc(db, 'buses', selectedBusId), {
                currentPassengers: newCount
            });
        } catch (error) {
            console.error("Error updating passengers:", error);
        }
    };

    const updateBusStatus = async (status: string) => {
        if (!selectedBusId) return;
        try {
            await updateDoc(doc(db, 'buses', selectedBusId), {
                status: status
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleLogout = async () => {
        if (isSharing) {
            await LocationSharingService.stopTracking();
        }
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

    const currentBus = busData || availableBuses.find(b => b.id === selectedBusId);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topHeader}>
                <View>
                    <Text style={styles.welcomeText}>Driver Dashboard</Text>
                    <Text style={styles.nameText}>{userProfile?.name || 'Loading...'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Live Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        <View style={styles.statusInfo}>
                            <View style={[styles.statusDot, { backgroundColor: isSharing ? '#34C759' : '#FF3B30' }]} />
                            <Text style={styles.statusLabel}>{isSharing ? 'Trip Active' : 'Trip Inactive'}</Text>
                        </View>
                        <Switch
                            value={isSharing}
                            onValueChange={handleToggleSharing}
                            trackColor={{ false: "#D1D1D6", true: "#34C759" }}
                            thumbColor="#fff"
                        />
                    </View>
                    <Text style={styles.statusSubtext}>
                        {isSharing ? 'Your location is being shared with passengers.' : 'Toggle to start sharing your live location.'}
                    </Text>
                </View>

                {currentBus ? (
                    <>
                        {/* Vehicle Dashboard */}
                        <View style={styles.dashboardCard}>
                            <View style={styles.dashHeader}>
                                <View style={styles.busIconCircle}>
                                    <Ionicons name="bus" size={28} color="#fff" />
                                </View>
                                <View style={styles.busMainInfo}>
                                    <Text style={styles.busNameText}>{currentBus.name}</Text>
                                    <Text style={styles.busPlateText}>{currentBus.vehicleNumber || 'TN-37-AB-1234'}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: currentBus.status === 'on_time' ? '#E8F5E9' : '#FFF3E0' }]}>
                                    <Text style={[styles.badgeText, { color: currentBus.status === 'on_time' ? '#2E7D32' : '#EF6C00' }]}>
                                        {currentBus.status?.replace('_', ' ').toUpperCase() || 'OFFLINE'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Feather name="users" size={20} color="#666" />
                                    <Text style={styles.statValue}>{currentBus.currentPassengers}/{currentBus.totalCapacity}</Text>
                                    <Text style={styles.statLabel}>Occupancy</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Ionicons name="git-network-outline" size={20} color="#666" />
                                    <Text style={styles.statValue}>{currentBus.routeNumber}</Text>
                                    <Text style={styles.statLabel}>Route ID</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statItem}>
                                    <Feather name="clock" size={20} color="#666" />
                                    <Text style={styles.statValue}>{currentBus.departureTime}</Text>
                                    <Text style={styles.statLabel}>Departure</Text>
                                </View>
                            </View>

                            {/* Passenger Management */}
                            <View style={styles.managementSection}>
                                <Text style={styles.manageTitle}>Passenger Management</Text>
                                <View style={styles.counterRow}>
                                    <TouchableOpacity 
                                        style={styles.counterBtn} 
                                        onPress={() => updatePassengers(-1)}
                                    >
                                        <Feather name="minus" size={24} color="#007AFF" />
                                    </TouchableOpacity>
                                    <View style={styles.countDisplay}>
                                        <Text style={styles.countText}>{currentBus.currentPassengers}</Text>
                                        <Text style={styles.countTotal}> / {currentBus.totalCapacity}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.counterBtn} 
                                        onPress={() => updatePassengers(1)}
                                    >
                                        <Feather name="plus" size={24} color="#007AFF" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.progressBg}>
                                    <View 
                                        style={[
                                            styles.progressFill, 
                                            { width: `${(currentBus.currentPassengers / currentBus.totalCapacity) * 100}%` }
                                        ]} 
                                    />
                                </View>
                            </View>

                            {/* Quick Status Updates */}
                            <View style={styles.statusUpdateRow}>
                                <TouchableOpacity 
                                    style={[styles.statusBtn, currentBus.status === 'on_time' && styles.activeStatusBtn]}
                                    onPress={() => updateBusStatus('on_time')}
                                >
                                    <Text style={[styles.statusBtnText, currentBus.status === 'on_time' && styles.activeStatusBtnText]}>On Time</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.statusBtn, currentBus.status === 'delayed' && styles.activeStatusBtnDelayed]}
                                    onPress={() => updateBusStatus('delayed')}
                                >
                                    <Text style={[styles.statusBtnText, currentBus.status === 'delayed' && styles.activeStatusBtnText]}>Delayed</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.statusBtn, currentBus.status === 'arriving' && styles.activeStatusBtnArriving]}
                                    onPress={() => updateBusStatus('arriving')}
                                >
                                    <Text style={[styles.statusBtnText, currentBus.status === 'arriving' && styles.activeStatusBtnText]}>Arriving</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Route Timeline */}
                        <Text style={styles.sectionTitle}>Route Timeline</Text>
                        <View style={styles.timelineCard}>
                            {routeStops.length > 0 ? routeStops.map((stop, index) => (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[styles.timelineDot, index === 0 && styles.activeDot]} />
                                        {index !== routeStops.length - 1 && <View style={styles.timelineLine} />}
                                    </View>
                                    <View style={styles.timelineRight}>
                                        <Text style={styles.stopName}>{stop.name}</Text>
                                        <Text style={styles.stopTime}>{stop.scheduled_time || stop.scheduledTime}</Text>
                                    </View>
                                </View>
                            )) : (
                                <Text style={styles.emptyText}>No route stops available for this bus.</Text>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={styles.noBusCard}>
                        <Ionicons name="alert-circle-outline" size={48} color="#8E8E93" />
                        <Text style={styles.noBusTitle}>No Bus Assigned</Text>
                        <Text style={styles.noBusSub}>Please contact your administrator to assign a vehicle to your profile.</Text>
                    </View>
                )}
                
                <View style={{ height: 40 }} />
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
    topHeader: {
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
    welcomeText: {
        fontSize: 14,
        color: '#6C757D',
        fontWeight: '500',
    },
    nameText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#212529',
    },
    logoutBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FFF5F5',
    },
    scrollContent: {
        padding: 20,
    },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    statusLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
    },
    statusSubtext: {
        fontSize: 14,
        color: '#6C757D',
    },
    dashboardCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    dashHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    busIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    busMainInfo: {
        flex: 1,
    },
    busNameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
    },
    busPlateText: {
        fontSize: 14,
        color: '#6C757D',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E9ECEF',
    },
    statValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#212529',
        marginTop: 5,
    },
    statLabel: {
        fontSize: 11,
        color: '#6C757D',
        marginTop: 2,
    },
    managementSection: {
        marginBottom: 20,
    },
    manageTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 15,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    counterBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CCE5FF',
    },
    countDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginHorizontal: 30,
    },
    countText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    countTotal: {
        fontSize: 18,
        color: '#6C757D',
    },
    progressBg: {
        height: 8,
        backgroundColor: '#E9ECEF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    statusUpdateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statusBtn: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#F8F9FA',
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    activeStatusBtn: {
        backgroundColor: '#E8F5E9',
        borderColor: '#2E7D32',
    },
    activeStatusBtnDelayed: {
        backgroundColor: '#FFEBEE',
        borderColor: '#C62828',
    },
    activeStatusBtnArriving: {
        backgroundColor: '#E3F2FD',
        borderColor: '#1565C0',
    },
    statusBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#495057',
    },
    activeStatusBtnText: {
        color: '#000',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 15,
        marginTop: 10,
    },
    timelineCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    timelineItem: {
        flexDirection: 'row',
        height: 60,
    },
    timelineLeft: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#E9ECEF',
        zIndex: 2,
    },
    activeDot: {
        backgroundColor: '#007AFF',
        borderWidth: 3,
        borderColor: '#CCE5FF',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E9ECEF',
    },
    timelineRight: {
        flex: 1,
        paddingLeft: 10,
    },
    stopName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#212529',
    },
    stopTime: {
        fontSize: 12,
        color: '#6C757D',
        marginTop: 2,
    },
    noBusCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 40,
        alignItems: 'center',
        marginTop: 20,
    },
    noBusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212529',
        marginTop: 15,
    },
    noBusSub: {
        fontSize: 14,
        color: '#6C757D',
        textAlign: 'center',
        marginTop: 8,
    },
    emptyText: {
        color: '#6C757D',
        textAlign: 'center',
        padding: 10,
    }
});
