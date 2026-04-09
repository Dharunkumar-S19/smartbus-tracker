import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    AppState
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
// import * as Notifications from 'expo-notifications';
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
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { RootStackParamList, GpsData, StopInfo } from '../types';
import { KalmanFilter } from '../utils/kalmanFilter';
import { NotificationService } from '../services/notificationService';
import { BusDataCache } from '../utils/busDataCache';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase/config';
import { startGpsSimulation, stopGpsSimulation } from '../utils/mockGpsSimulator';
// Remove hardcoded route import
// import { BUS_001_POLYLINE } from '../data/bus001_route';

// Notifications setup disabled for Expo Go compatibility
/*
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && Platform.OS !== 'web') {
    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true
            }),
        });
    } catch (error) {
        console.warn('Error setting notification handler:', error);
    }
}
*/

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
    const [polyline, setPolyline] = useState<Array<{ lat: number, lng: number }> | null>(null);
    const [stops, setStops] = useState<StopInfo[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const appState = useRef(AppState.currentState);

    // Track notifications to prevent spamming
    const hasNotifiedForStop = useRef<Record<string, boolean>>({});

    // Filters for smoothing Bus GPS
    const latFilter = useRef(new KalmanFilter(1, 0.1));
    const lngFilter = useRef(new KalmanFilter(1, 0.1));
    const wsRef = useRef<WebSocket | null>(null);
    const requestAbortController = useRef<AbortController | null>(null);

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
        // Disabled for Expo Go compatibility
        // await NotificationService.scheduleArrivalNotification(busName, stopName, mins);
    };

    // Handle app state changes to maintain tracking when switching apps
    const handleAppStateChange = (state: AppState['currentState']) => {
        appState.current = state;
        if (state === 'inactive') {
            console.log('👁️ App moved to background - tracking continues');
        } else if (state === 'active') {
            console.log('🟢 App returned to foreground');
        }
    };

    // --- Lifecycle ---
    // Initialize map data from cache immediately
    useEffect(() => {
        let mounted = true;

        const loadCachedData = async () => {
            try {
                const cached = await BusDataCache.get(busId);
                if (mounted && cached) {
                    setPolyline(cached.polyline);
                    setStops(cached.stops);
                    setIsMapReady(true);
                    console.log('📦 Loaded cached bus data for', busId);
                }
            } catch (error) {
                console.warn('Error loading cached data:', error);
            }
        };

        loadCachedData();

        return () => {
            mounted = false;
        };
    }, [busId]);

    // Load live bus location and handle app state changes for background persistence
    useEffect(() => {
        let mounted = true;
        const appStateSubsription = AppState.addEventListener('change', handleAppStateChange);

        const initialize = async () => {
            // 1. Setup Permissions (quick non-blocking)
            await setupNotifications();
            const { status } = await Location.requestForegroundPermissionsAsync();

            // 2. Get initial user position (don't wait for it)
            let userSub: Location.LocationSubscription | null = null;
            if (status === 'granted') {
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                    .then((loc) => {
                        if (mounted) {
                            setUserLocation({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude
                            });
                        }
                    })
                    .catch(() => {
                        if (mounted) setUserLocation(DEFAULT_COORD);
                    });

                // Watch for position updates in background
                Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000,
                        distanceInterval: 10
                    },
                    (newLoc) => {
                        if (mounted) {
                            setUserLocation({
                                latitude: newLoc.coords.latitude,
                                longitude: newLoc.coords.longitude
                            });
                        }
                    }
                ).then((sub) => {
                    userSub = sub;
                }).catch(() => {
                    if (mounted) setUserLocation(DEFAULT_COORD);
                });
            } else {
                if (mounted) setUserLocation(DEFAULT_COORD);
            }

            // 3. Firebase RTDB Subscription for Bus - FASTER TIMEOUT (2 seconds)
            const busRef = ref(rtdb, `live_locations/${busId}`);
            
            // Reduced timeout: show map after 2 seconds even if bus location not available
            const busLocationTimeout = setTimeout(() => {
                if (mounted && !busLocation) {
                    console.warn(`Bus location not available for ${busId} within 2s, showing map`);
                    setBusLocation(DEFAULT_COORD);
                }
            }, 2000);

            const unsubscribe = onValue(busRef, (snapshot) => {
                if (!mounted) return;
                clearTimeout(busLocationTimeout);
                const rawData = snapshot.val();
                if (rawData) {
                    // Map RTDB data to logic
                    const data: GpsData = {
                        lat: rawData.smoothed_lat ?? rawData.raw_lat ?? rawData.lat,
                        lng: rawData.smoothed_lng ?? rawData.raw_lng ?? rawData.lng,
                        speed: rawData.speed,
                        nextStop: rawData.next_stop ? { name: rawData.next_stop, lat: 0, lng: 0, scheduledTime: "--" } : undefined,
                        etaMinutes: rawData.eta_minutes,
                        totalEtaMinutes: rawData.total_eta_minutes,
                        distanceRemaining: rawData.distance_remaining,
                        routeProgress: rawData.route_progress,
                        currentPassengers: rawData.passenger_count,
                        timestamp: rawData.timestamp ? String(rawData.timestamp) : String(Date.now())
                    };

                    // Apply local Kalman filter for visual smoothness
                    const smoothLat = latFilter.current.filter(data.lat);
                    const smoothLng = lngFilter.current.filter(data.lng);

                    setBusLocation({ latitude: smoothLat, longitude: smoothLng });
                    setJourneyData(data);
                    stopGpsSimulation();
                }
            });

            // 4. Production WebSocket Subscription (fallback to Firebase)
            const wsUrl = `wss://smartbus-tracker-z7tn.onrender.com/api/ws/bus/${busId}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                if (!mounted) return;

                try {
                    const rawData = JSON.parse(event.data);

                    // Map backend SmoothedLocation fields
                    const data: GpsData = {
                        lat: rawData.smoothed_lat ?? rawData.raw_lat,
                        lng: rawData.smoothed_lng ?? rawData.raw_lng,
                        speed: rawData.speed,
                        nextStop: rawData.next_stop ? { name: rawData.next_stop, lat: 0, lng: 0, scheduledTime: "--" } : undefined,
                        etaMinutes: rawData.eta_minutes,
                        totalEtaMinutes: rawData.total_eta_minutes,
                        distanceRemaining: rawData.distance_remaining,
                        routeProgress: rawData.route_progress,
                        currentPassengers: rawData.passenger_count,
                        timestamp: rawData.timestamp ? String(rawData.timestamp) : String(Date.now())
                    };

                    stopGpsSimulation();
                    
                    const smoothLat = latFilter.current.filter(data.lat);
                    const smoothLng = lngFilter.current.filter(data.lng);

                    setBusLocation({ latitude: smoothLat, longitude: smoothLng });
                    setJourneyData(data);

                    // Check for Notification Triggers
                    if (data.etaMinutes !== undefined && data.etaMinutes !== null && data.etaMinutes <= 3 && data.nextStop) {
                        const stopName = data.nextStop.name;
                        if (!hasNotifiedForStop.current[stopName]) {
                            hasNotifiedForStop.current[stopName] = true;
                            showBanner();
                            handlePushNotification(stopName, data.etaMinutes);
                        }
                    }
                } catch (e) {
                    console.warn("Error parsing WebSocket message", e);
                }
            };

            ws.onerror = (e) => {
                console.log("WebSocket connection unavailable. Relying on Firebase RTDB.");
                if (busId !== 'BUS_001') {
                    startGpsSimulation((mockData) => {
                        if (!mounted) return;
                        setBusLocation({ latitude: mockData.lat, longitude: mockData.lng });
                        setJourneyData(mockData);
                    });
                }
            };

            return () => {
                unsubscribe();
            };
        };

        initialize();

        return () => {
            mounted = false;
            appStateSubsription.remove();
            if (wsRef.current) {
                wsRef.current.close();
            }
            const busRef = ref(rtdb, `live_locations/${busId}`);
            off(busRef);
            stopGpsSimulation();
            NotificationService.cancelAllNotifications();
            if (requestAbortController.current) {
                requestAbortController.current.abort();
            }
        };
    }, [busId]);

    // Fetch bus details in background with caching
    useEffect(() => {
        let mounted = true;
        const fetchBusDetails = async () => {
            try {
                setIsLoadingDetails(true);
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://smartbus-tracker-z7tn.onrender.com';
                
                // Create abort controller for this request
                const controller = new AbortController();
                requestAbortController.current = controller;

                const response = await fetch(`${apiUrl}/api/bus/${busId}/details`, {
                    signal: controller.signal,
                    // Add timeout for slow networks
                });
                
                if (!mounted) return;

                if (response.ok) {
                    const data = await response.json();
                    
                    if (mounted) {
                        if (data.route_polyline && Array.isArray(data.route_polyline)) {
                            setPolyline(data.route_polyline);
                        }
                        if (data.stops && Array.isArray(data.stops)) {
                            const validStops = data.stops.filter((stop: any) => stop.lat && stop.lng && stop.name);
                            setStops(validStops);
                            console.log(`✅ Loaded ${validStops.length} stops`);
                        }

                        // Cache the data for next time
                        if (data.route_polyline && data.stops) {
                            await BusDataCache.set(busId, data.route_polyline, data.stops);
                        }
                        
                        // Mark map as ready if we loaded the polyline from API
                        if (data.route_polyline) {
                            setIsMapReady(true);
                        }
                    }
                } else {
                    console.warn(`Failed to fetch bus details: ${response.status}`);
                }
            } catch (error: any) {
                // Skip error logging for aborted requests
                if (error.name !== 'AbortError') {
                    console.warn('Failed to fetch bus details:', error?.message || error);
                }
            } finally {
                if (mounted) {
                    setIsLoadingDetails(false);
                }
            }
        };

        fetchBusDetails();

        return () => {
            mounted = false;
            if (requestAbortController.current) {
                requestAbortController.current.abort();
            }
        };
    }, [busId]);

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
                <MapView
                    latitude={busLocation?.latitude || DEFAULT_COORD.latitude}
                    longitude={busLocation?.longitude || DEFAULT_COORD.longitude}
                    polyline={polyline || undefined}
                    stops={stops.length > 0 ? stops : undefined}
                />
                {!busLocation && (
                    <View style={styles.mapLoadingOverlay}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.mapLoadingText}>Loading bus location...</Text>
                    </View>
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
                        <Text style={styles.statValue}>
                            {journeyData.totalEtaMinutes ? `${Math.round(journeyData.totalEtaMinutes)} min` : '-'}
                        </Text>
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
    mapLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 10,
    },
    mapLoadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 14,
        fontWeight: '500',
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
