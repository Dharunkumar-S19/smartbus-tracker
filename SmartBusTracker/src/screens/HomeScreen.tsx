import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { AuthButton } from '../components/AuthButton';

// Import MapView using generic name, metro will resolve .web.tsx or .native.tsx
import MapView from '../components/MapView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const DEFAULT_COORD = { latitude: 11.0168, longitude: 76.9558 }; // Tiruchengode fallback

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp>();

    // Search State
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Location & Map State
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    // Autocomplete states
    const [showSuggestions, setShowSuggestions] = useState<'from' | 'to' | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoadingSuggestions(true);
        try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'OK') {
                setSuggestions(data.predictions);
            } else {
                console.warn('Google Places API error:', data.status);
                setSuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        const query = showSuggestions === 'from' ? from : to;
        const delayDebounceFn = setTimeout(() => {
            if (query) {
                fetchSuggestions(query);
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [from, to, showSuggestions]);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        let mounted = true;

        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    setLocation(DEFAULT_COORD);
                    setLoadingLocation(false);
                    return;
                }

                // Initial position
                let initialLoc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation,
                });
                
                if (mounted) {
                    setLocation({
                        latitude: initialLoc.coords.latitude,
                        longitude: initialLoc.coords.longitude,
                    });
                    setLoadingLocation(false);
                }

                // Watch position for live updates
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 2000,
                        distanceInterval: 1,
                    },
                    (newLoc) => {
                        if (mounted) {
                            setLocation({
                                latitude: newLoc.coords.latitude,
                                longitude: newLoc.coords.longitude,
                            });
                        }
                    }
                );
            } catch (error) {
                console.warn("Could not fetch location", error);
                if (!location) setLocation(DEFAULT_COORD);
                setLoadingLocation(false);
            }
        })();

        return () => {
            mounted = false;
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    const handleSwap = () => {
        setFrom(to);
        setTo(from);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    const handleSearch = () => {
        const trimmedFrom = from.trim();
        const trimmedTo = to.trim();

        if (!trimmedFrom) {
            alert('Please enter departure location');
            return;
        }

        if (!trimmedTo) {
            alert('Please enter destination');
            return;
        }

        if (trimmedFrom.toLowerCase() === trimmedTo.toLowerCase()) {
            alert('From and To cannot be the same');
            return;
        }

        navigation.navigate('BusList' as any, {
            from: trimmedFrom,
            to: trimmedTo,
            date: date.toISOString().split('T')[0]
        });
    };

    const handleSelectSuggestion = (prediction: any) => {
        const locationName = prediction.description.split(',')[0];
        if (showSuggestions === 'from') {
            setFrom(locationName);
        } else if (showSuggestions === 'to') {
            setTo(locationName);
        }
        setShowSuggestions(null); // Hide suggestions after selection
        setSuggestions([]);
    };

    return (
        <View style={styles.container}>
            {/* 1. Map Background (Absolute Fill) */}
            <View style={StyleSheet.absoluteFillObject}>
                {loadingLocation || !location ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loadingText}>Finding your location...</Text>
                    </View>
                ) : (
                    <MapView latitude={location.latitude} longitude={location.longitude} />
                )}
            </View>

            {/* 2. Floating Search Card */}
            <View style={styles.searchCard}>
                <View style={styles.inputContainer}>
                    {/* Swap Button absolutely positioned in middle of inputs */}
                    <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
                        <Text style={styles.swapIcon}>↕</Text>
                    </TouchableOpacity>

                    <View style={styles.inputRow}>
                        <Text style={styles.pinIcon}>📍</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="From"
                            value={from}
                            onChangeText={(text) => {
                                setFrom(text);
                                setShowSuggestions('from');
                            }}
                            onFocus={() => setShowSuggestions('from')}
                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        />
                    </View>

                    {/* Render AutoComplete for "From" directly below the input */}
                    {showSuggestions === 'from' && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((loc, idx) => (
                                <TouchableOpacity
                                    key={`from-${idx}`}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(loc)}
                                >
                                    <Text style={styles.suggestionText}>{loc.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={[styles.inputRow, { marginTop: 12 }]}>
                        <Text style={styles.pinIcon}>📍</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="To"
                            value={to}
                            onChangeText={(text) => {
                                setTo(text);
                                setShowSuggestions('to');
                            }}
                            onFocus={() => setShowSuggestions('to')}
                            onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                        />
                    </View>

                    {/* Render AutoComplete for "To" directly below the input */}
                    {showSuggestions === 'to' && suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((loc, idx) => (
                                <TouchableOpacity
                                    key={`to-${idx}`}
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(loc)}
                                >
                                    <Text style={styles.suggestionText}>{loc.description}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.dateRow}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.calendarIcon}>📅</Text>
                    <Text style={styles.dateText}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                </TouchableOpacity>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()} // Prevent past dates
                        style={Platform.OS === 'ios' ? { width: '100%', backgroundColor: 'white' } : undefined}
                    />
                )}

                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Text style={styles.searchButtonText}>Search Buses</Text>
                </TouchableOpacity>
            </View>

            {/* 3. Floating Auth Button */}
            <View style={styles.authContainer}>
                <AuthButton />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5', // Fallback color under map
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    searchCard: {
        marginTop: Platform.OS === 'ios' ? 60 : 40,
        marginHorizontal: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    inputContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#333',
        paddingLeft: 8,
    },
    pinIcon: {
        fontSize: 18,
    },
    swapButton: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -16, // Half of height to center perfectly between inputs
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    swapIcon: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563EB',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        marginBottom: 16,
    },
    calendarIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    dateText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    searchButton: {
        backgroundColor: '#2563EB', // Blue primary color
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    suggestionsContainer: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 150,
        zIndex: 50, // ensures the dropdown renders above the other fields
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    suggestionText: {
        fontSize: 15,
        color: '#333',
    },
    authContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 16,
        zIndex: 20,
    }
});
