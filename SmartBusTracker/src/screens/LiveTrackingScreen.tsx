import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withSpring,
    Easing
} from 'react-native-reanimated';
import { Ionicons, Feather } from '@expo/vector-icons';

import { RootStackParamList, GpsData } from '../types';
import { KalmanFilter } from '../utils/kalmanFilter';
import { NotificationService } from '../services/notificationService';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { startGpsSimulation, stopGpsSimulation } from '../utils/mockGpsSimulator';

// Setup notifications routing to show while app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
    }),
});

// Import MapView using generic name, metro will resolve .web.tsx or .native.tsx
import MapView from '../components/MapView';

type LiveTrackingRouteProp = RouteProp<RootStackParamList, 'LiveTracking'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveTracking'>;

const DEFAULT_COORD = { latitude: 11.0168, longitude: 76.9558 };

export default function LiveTrackingScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<LiveTrackingRouteProp>();
    const { busId, busName, from, to } = route.params;

    // --- State ---
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [busLocation, setBusLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [journeyData, setJourneyData] = useState<Partial<GpsData>>({});

    // Track notifications to prevent spamming
    const hasNotifiedForStop = useRef<Record<string, boolean>>({});

    // Filters for smoothing Bus GPS
    const latFilter = useRef(new KalmanFilter(1, 0.1));
    const lngFilter = useRef(new KalmanFilter(1, 0.1));
    const wsRef = useRef<WebSocket | null>(null);

    // --- Animations ---
    const pulseAnim = useSharedValue(1);
    const bannerY = useSharedValue(-100);

    useEffect(() => {
        // Pulse animation for the "LIVE" indicator
        pulseAnim.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1, // infinite
            true // reverse
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseAnim.value
    }));

    const bannerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bannerY.value }]
    }));

    const showBanner = () => {
        bannerY.value = withSpring(0, { damping: 12 });
        // Auto dismiss after 10 seconds
        setTimeout(() => {
            bannerY.value = withSpring(-100);
        }, 10000);
    };

    const setupNotifications = async () => {
        await NotificationService.setupNotificationChannel();
        return await NotificationService.requestNotificationPermission();
    };

    const handlePushNotification = async (stopName: string, mins: number) => {
        await NotificationService.scheduleArrivalNotification(busName, stopName, mins);
    };

    // --- Lifecycle ---
    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            // 1. Setup Permissions
            await setupNotifications();
            let { status } = await Location.requestForegroundPermissionsAsync();

            // 2. Fetch User Location
            if (status === 'granted') {
                try {
                    let loc = await Location.getCurrentPositionAsync({});
                    if (mounted) {
                        setUserLocation({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude
                        });
                    }
                } catch (error) {
                    console.warn('Failed to get location');
                    if (mounted) setUserLocation(DEFAULT_COORD);
                }
            } else {
                if (mounted) setUserLocation(DEFAULT_COORD);
            }

            // 3. Start Backend WebSocket Subscription
            const wsBaseUrl = Platform.OS === 'android' ? 'ws://10.0.2.2:8000' : 'ws://localhost:8000';
            const wsUrl = `${wsBaseUrl}/api/ws/bus/${busId}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                if (!mounted) return;

                try {
                    const rawData = JSON.parse(event.data);

                    // Map backend SmoothedLocation fields to expected GpsData format
                    const data: GpsData = {
                        lat: rawData.smoothed_lat ?? rawData.raw_lat,
                        lng: rawData.smoothed_lng ?? rawData.raw_lng,
                        speed: rawData.speed,
                        nextStop: rawData.next_stop ? { name: rawData.next_stop, lat: 0, lng: 0, scheduledTime: "--" } : undefined,
                        etaMinutes: rawData.eta_minutes,
                        distanceRemaining: rawData.distance_remaining,
                        routeProgress: rawData.route_progress,
                        currentPassengers: rawData.passenger_count,
                        timestamp: rawData.timestamp ? String(rawData.timestamp) : String(Date.now())
                    };

                    stopGpsSimulation();

                    // Apply local Kalman filter for visual smoothness
                    const smoothLat = latFilter.current.filter(data.lat);
                    const smoothLng = lngFilter.current.filter(data.lng);

                    setBusLocation({ latitude: smoothLat, longitude: smoothLng });
                    setJourneyData(data);

                    // Check for Notification Triggers
                    if (data.etaMinutes !== undefined && data.etaMinutes !== null && data.etaMinutes <= 3 && data.nextStop) {
                        const stopName = data.nextStop.name;
                        if (!hasNotifiedForStop.current[stopName]) {
                            hasNotifiedForStop.current[stopName] = true;

                            // Fire In-App Banner
                            showBanner();
                            // Fire OS Push Notification
                            handlePushNotification(stopName, data.etaMinutes);
                        }
                    }
                } catch (e) {
                    console.warn("Error parsing WebSocket message", e);
                }
            };

            ws.onerror = (e) => {
                console.log("WebSocket error or unavailable! Falling back to simulator.");
                startGpsSimulation((mockData) => {
                    if (!mounted) return;
                    setBusLocation({ latitude: mockData.lat, longitude: mockData.lng });
                    setJourneyData(mockData);

                    if (mockData.etaMinutes && mockData.etaMinutes <= 3 && mockData.nextStop) {
                        const stopName = mockData.nextStop.name;
                        if (!hasNotifiedForStop.current[stopName]) {
                            hasNotifiedForStop.current[stopName] = true;
                            showBanner();
                            handlePushNotification(stopName, mockData.etaMinutes);
                        }
                    }
                });
            };
        };

        initialize();

        return () => {
            mounted = false;
            if (wsRef.current) {
                wsRef.current.close();
            }
            stopGpsSimulation();
            NotificationService.cancelAllNotifications();
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* --- IN-APP ALERT BANNER --- */}
            <Animated.View style={[styles.alertBanner, bannerStyle]}>
                <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>🚌 Your bus is arriving in {journeyData.etaMinutes} minutes!</Text>
                    <Text style={styles.alertSub}>at stop: {journeyData.nextStop?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => { bannerY.value = withSpring(-100); }}>
                    <Feather name="x" size={24} color="white" />
                </TouchableOpacity>
            </Animated.View>

            {/* --- 1. HEADER --- */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{busName}</Text>

                <View style={styles.liveIndicator}>
                    <Animated.View style={[styles.liveDot, pulseStyle]} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </View>

            {/* --- 2. MAP SECTION --- */}
            <View style={styles.mapContainer}>
                {!busLocation || !userLocation ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loadingText}>Locating bus...</Text>
                    </View>
                ) : (
                    <MapView
                        latitude={busLocation.latitude}
                        longitude={busLocation.longitude}
                    />
                )}
            </View>

            {/* --- 3. BOTTOM INFO CARD --- */}
            <View style={styles.bottomCard}>
                {/* ROW 1: JOURNEY */}
                <View style={styles.journeyRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.journeyLabel}>From</Text>
                        <Text style={styles.journeyName} numberOfLines={1}>{from}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#64748b" style={{ marginHorizontal: 12 }} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.journeyLabel}>To</Text>
                        <Text style={styles.journeyName} numberOfLines={1}>{to}</Text>
                    </View>
                </View>

                {/* ROW 2: NEXT STOP */}
                <View style={styles.nextStopRow}>
                    <View style={styles.nextStopLeft}>
                        <View style={styles.stopIconBg}>
                            <Ionicons name="bus" size={20} color="#F59E0B" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.nextStopLabel}>Next Stop</Text>
                            <Text style={styles.nextStopName}>{journeyData.nextStop?.name || 'Loading...'}</Text>
                        </View>
                    </View>
                    <View style={styles.etaBadge}>
                        <Text style={styles.etaBadgeText}>
                            {journeyData.etaMinutes !== undefined ? `Arriving in ${journeyData.etaMinutes} min` : 'Arriving in -- min'}
                        </Text>
                    </View>
                </View>

                {/* ROW 3: PROGRESS BAR */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Route Progress</Text>
                        <Text style={styles.progressValue}>{Math.round(journeyData.routeProgress || 0)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${journeyData.routeProgress || 0}%` as any }]} />
                    </View>
                </View>

                {/* ROW 4: STATS */}
                <View style={styles.statsRow}>
                    <View style={styles.statColumn}>
                        <Text style={styles.statLabel}>🚀 Current Speed</Text>
                        <Text style={styles.statValue}>{journeyData.speed ?? '-'} km/h</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statColumn}>
                        <Text style={styles.statLabel}>📍 Distance Left</Text>
                        <Text style={styles.statValue}>{journeyData.distanceRemaining ?? '-'} km</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statColumn}>
                        <Text style={styles.statLabel}>⏱️ Total ETA</Text>
                        <Text style={styles.statValue}>{journeyData.etaMinutes ? journeyData.etaMinutes * 2 : '-'} min</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 16,
    },
    header: {
        height: Platform.OS === 'ios' ? 100 : 80,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC2626',
        marginRight: 6,
    },
    liveText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: 'bold',
    },
    alertBanner: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 16,
        right: 16,
        backgroundColor: '#2563EB',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    alertSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    mapContainer: {
        flex: 1, // Will take up remaining space above the card
    },
    bottomCard: {
        height: '35%',
        minHeight: 280,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        zIndex: 5,
    },
    journeyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    journeyLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    journeyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    nextStopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    nextStopLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stopIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextStopLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 2,
    },
    nextStopName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    etaBadge: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    etaBadgeText: {
        color: '#2563EB',
        fontSize: 13,
        fontWeight: 'bold',
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '500',
    },
    progressValue: {
        fontSize: 13,
        color: '#16A34A',
        fontWeight: 'bold',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#16A34A',
        borderRadius: 4,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
        justifyContent: 'space-between',
    },
    statColumn: {
        flex: 1,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#e2e8f0',
        height: '100%',
        marginHorizontal: 8,
    },
    statLabel: {
        fontSize: 11,
        color: '#64748b',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
    }
});
