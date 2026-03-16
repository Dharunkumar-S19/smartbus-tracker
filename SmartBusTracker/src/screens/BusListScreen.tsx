import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Animated,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather, Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Bus } from '../types';
import mockBuses from '../data/mockBuses';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

type BusListScreenRouteProp = RouteProp<RootStackParamList, 'BusList'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BusList'>;

// --------------------------------------------------------------------------
// Skeleton component for loading state
// --------------------------------------------------------------------------
const SkeletonCard = () => {
    const opacity = useState(new Animated.Value(0.3))[0];

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View style={[styles.card, { opacity }]}>
            <View style={{ height: 20, width: '60%', backgroundColor: '#e2e8f0', marginBottom: 16, borderRadius: 4 }} />
            <View style={{ height: 16, width: '80%', backgroundColor: '#e2e8f0', marginBottom: 8, borderRadius: 4 }} />
            <View style={{ height: 16, width: '40%', backgroundColor: '#e2e8f0', marginBottom: 16, borderRadius: 4 }} />
            <View style={{ height: 6, width: '100%', backgroundColor: '#e2e8f0', marginBottom: 16, borderRadius: 3 }} />
            <View style={{ height: 44, width: '100%', backgroundColor: '#cbd5e1', borderRadius: 8 }} />
        </Animated.View>
    );
};

export default function BusListScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<BusListScreenRouteProp>();
    const { from, to, date } = route.params;

    const [loading, setLoading] = useState(true);
    const [allBuses, setAllBuses] = useState<Bus[]>([]);
    const [filteredBuses, setFilteredBuses] = useState<Bus[]>([]);
    const [showingMockData, setShowingMockData] = useState(false);

    // Smart filter function handling case insensitive partial matching
    const filterBuses = (buses: Bus[], searchFrom: string, searchTo: string): Bus[] => {
        const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
        const fromNorm = normalize(searchFrom);
        const toNorm = normalize(searchTo);

        return buses.filter(bus => {
            const busFrom = normalize(bus.from);
            const busTo = normalize(bus.to);

            const exactMatch = busFrom === fromNorm && busTo === toNorm;
            const partialMatch = busFrom.includes(fromNorm) && busTo.includes(toNorm);
            const reverseMatch = busFrom === toNorm && busTo === fromNorm;

            return exactMatch || partialMatch || reverseMatch;
        });
    };

    useEffect(() => {
        const fetchBuses = async () => {
            try {
                // 1. Attempt to fetch real data from Firestore
                const busesRef = collection(db, 'buses');
                const q = query(
                    busesRef,
                    where("from", "==", from.trim()),
                    where("to", "==", to.trim())
                );

                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const fetchedBuses: Bus[] = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data() as Bus;
                        data.id = doc.id; // Map Firestore ID to Bus obj
                        fetchedBuses.push(data);
                    });
                    setAllBuses(fetchedBuses);
                    setShowingMockData(false);
                } else {
                    // 2. Fall back to mock data
                    console.log("No Firebase buses found. Falling back to mock data.");
                    setAllBuses(mockBuses);
                    setShowingMockData(true);
                }
            } catch (error) {
                // 3. Handle errors gracefully by falling back to mock data
                console.warn("Error fetching from Firestore:", error);
                setAllBuses(mockBuses);
                setShowingMockData(true);
            } finally {
                setLoading(false);
            }
        };

        fetchBuses();
    }, [from, to]);

    // Apply filter immediately whenever allBuses or search params change
    useEffect(() => {
        const filtered = filterBuses(allBuses, from, to);
        setFilteredBuses(filtered);
    }, [allBuses, from, to]);

    // Handle rendering capacity progress bar colors
    const getCapacityColor = (current: number, total: number) => {
        const percentage = current / total;
        if (percentage > 0.8) return '#DC2626'; // Red
        if (percentage >= 0.5) return '#F59E0B'; // Orange
        return '#16A34A'; // Green
    };

    // Render Status Badge
    const renderStatusBadge = (bus: Bus) => {
        let bgColor = '#16A34A'; // Default green for on_time
        let text = 'On Time';

        if (bus.status === 'delayed') {
            bgColor = '#DC2626'; // Red
            text = `Delayed +${bus.delayMinutes} min`;
        } else if (bus.status === 'arriving') {
            bgColor = '#2563EB'; // Blue
            text = 'Arriving';
        }

        return (
            <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
                <Text style={styles.statusText}>{text}</Text>
            </View>
        );
    };

    // Render individual bus card
    const renderBusCard = ({ item }: { item: Bus }) => {
        const capacityColor = getCapacityColor(item.currentPassengers, item.totalCapacity);
        const fillWidth = `${(item.currentPassengers / item.totalCapacity) * 100}%`;

        return (
            <View style={styles.card}>
                {/* Top Header Row */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderTitle}>
                        <Text style={styles.busName}>🚌 {item.name}</Text>
                        <Text style={styles.busDetails}>{item.vehicleNumber}  •  Route {item.routeNumber}</Text>
                    </View>
                    {renderStatusBadge(item)}
                </View>

                {/* Route Details */}
                <View style={styles.routeContainer}>
                    <Text style={styles.routeText}>📍 {item.from}  ──────►  {item.to}</Text>
                </View>

                <Text style={styles.timeText}>🕐 Departs: {item.departureTime}</Text>

                {/* Passengers */}
                <View style={styles.passengerContainer}>
                    <View style={styles.passengerRow}>
                        <Text style={styles.passengerText}>👥 Passengers: {item.currentPassengers}/{item.totalCapacity}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: fillWidth as any, backgroundColor: capacityColor }]} />
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={styles.trackButton}
                    onPress={() => navigation.navigate('LiveTracking', {
                        busId: item.id,
                        busName: item.name,
                        from: item.from,
                        to: item.to
                    })}
                >
                    <Text style={styles.trackButtonText}>Track Now →</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚌</Text>
            <Text style={styles.emptyTitle}>No Buses Found</Text>

            <View style={styles.emptyCard}>
                <Text style={styles.emptySubtitle}>No buses available for route:</Text>
                <Text style={styles.emptyRouteHighlight}>{from} → {to}</Text>

                <View style={styles.emptyDivider} />

                <Text style={styles.emptySuggestionsLabel}>Try these routes:</Text>
                <TouchableOpacity style={styles.suggestionPill} onPress={() => navigation.navigate('BusList' as any, { from: 'Kattampatti', to: 'Gandhipuram', date: date })}>
                    <Text style={styles.suggestionText}>• Kattampatti → Gandhipuram</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.searchAgainBtn} onPress={() => navigation.navigate('Home')}>
                <Text style={styles.searchAgainBtnText}>🔍 Search Again</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* 1. Header Section */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerRoute}>{from} → {to}</Text>
                    <Text style={styles.headerDate}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</Text>
                </View>
            </View>

            {/* 2. List / Loading / Empty UI */}
            {showingMockData && !loading && filteredBuses.length > 0 && (
                <View style={styles.mockBanner}>
                    <Text style={styles.mockBannerText}>⚠️ Showing sample data</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.listContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            ) : (
                <FlatList
                    data={filteredBuses}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBusCard}
                    contentContainerStyle={Object.keys(filteredBuses).length === 0 ? [styles.listContainer, { justifyContent: 'center' }] : styles.listContainer}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        zIndex: 10,
    },
    headerBackButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingRight: 32, // to offset back button width
    },
    headerRoute: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
        textAlign: 'center',
    },
    headerDate: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    listContainer: {
        padding: 12,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardHeaderTitle: {
        flex: 1,
    },
    busName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    busDetails: {
        fontSize: 13,
        color: '#64748b',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    routeContainer: {
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#2563EB',
    },
    routeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
        marginBottom: 16,
    },
    passengerContainer: {
        marginBottom: 16,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
    },
    passengerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    passengerText: {
        fontSize: 13,
        color: '#334155',
        fontWeight: '500',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#e2e8f0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    trackButton: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    trackButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 16,
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#64748b',
        marginBottom: 8,
    },
    emptyRouteHighlight: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    emptyDivider: {
        height: 1,
        width: '100%',
        backgroundColor: '#e2e8f0',
        marginVertical: 16,
    },
    emptySuggestionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },
    suggestionPill: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    suggestionText: {
        color: '#0f172a',
        fontWeight: '500',
        fontSize: 14,
    },
    searchAgainBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    searchAgainBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    mockBanner: {
        backgroundColor: '#FEF3C7', // amber-100
        padding: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A', // amber-200
    },
    mockBannerText: {
        color: '#92400E', // amber-700
        fontSize: 14,
        fontWeight: '500',
    }
});
