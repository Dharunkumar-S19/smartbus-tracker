import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import SimpleMapView from './SimpleMapView';

interface Coordinate {
    lat: number;
    lng: number;
}

interface StopMarker {
    name: string;
    lat: number;
    lng: number;
}

interface MapViewMobileProps {
    latitude: number;
    longitude: number;
    polyline?: Coordinate[];
    stops?: StopMarker[];
}

export default function MapViewMobile({ latitude, longitude, polyline, stops }: MapViewMobileProps) {
    const [MapView, setMapView] = useState<any>(null);
    const [Marker, setMarker] = useState<any>(null);
    const [Polyline, setPolyline] = useState<any>(null);
    const [PROVIDER_GOOGLE, setProviderGoogle] = useState<any>(null);
    const [useFallback, setUseFallback] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🗺️ MapView Native: Loading react-native-maps...');
        
        // Dynamically import react-native-maps with timeout
        const loadMap = async () => {
            try {
                // Set a timeout for loading
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Map loading timeout')), 3000)
                );

                const loadPromise = import('react-native-maps');

                const maps: any = await Promise.race([loadPromise, timeoutPromise]);
                
                console.log('✅ react-native-maps loaded successfully');
                setMapView(() => maps.default);
                setMarker(() => maps.Marker);
                setPolyline(() => maps.Polyline);
                setProviderGoogle(() => maps.PROVIDER_GOOGLE);
                setLoading(false);
            } catch (err: any) {
                console.warn('⚠️ react-native-maps not available, using fallback:', err.message);
                setUseFallback(true);
                setLoading(false);
            }
        };

        loadMap();
    }, []);

    console.log('🗺️ MapView Native state:', { 
        latitude, 
        longitude, 
        loading,
        useFallback,
        hasMapView: !!MapView
    });
    
    const validStops = stops && Array.isArray(stops) 
        ? stops.filter(stop => stop && stop.lat && stop.lng && stop.name) 
        : [];

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.error('❌ Invalid coordinates:', { latitude, longitude });
        return (
            <View style={[styles.map, styles.errorContainer]}>
                <Text style={styles.errorText}>⚠️ Invalid location data</Text>
                <Text style={styles.errorSubtext}>Lat: {latitude}, Lng: {longitude}</Text>
            </View>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <View style={[styles.map, styles.errorContainer]}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    // Use fallback if react-native-maps failed to load
    if (useFallback || !MapView) {
        console.log('🗺️ Using SimpleMapView fallback');
        return <SimpleMapView latitude={latitude} longitude={longitude} polyline={polyline} stops={stops} />;
    }

    // Try to render react-native-maps
    try {
        return (
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                zoomEnabled={true}
                scrollEnabled={true}
                loadingEnabled={true}
                loadingIndicatorColor="#2563EB"
                loadingBackgroundColor="#ffffff"
            >
                {Polyline && polyline && polyline.length > 0 && (
                    <Polyline
                        coordinates={polyline.map(coord => ({
                            latitude: coord.lat,
                            longitude: coord.lng
                        }))}
                        strokeColor="#3B82F6"
                        strokeWidth={6}
                        lineDashPattern={[0]}
                        geodesic={true}
                    />
                )}
                
                {Marker && validStops.length > 0 && validStops.map((stop, index) => (
                    <Marker
                        key={`stop-${index}`}
                        coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        title={stop.name}
                    >
                        <View style={styles.stopMarkerContainer}>
                            <Text style={styles.stopMarkerText}>{index + 1}</Text>
                        </View>
                    </Marker>
                ))}
                
                {Marker && (
                    <Marker
                        coordinate={{ latitude, longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        title="Bus Location"
                    >
                        <View style={styles.markerContainer}>
                            <View style={styles.markerInner} />
                        </View>
                    </Marker>
                )}
            </MapView>
        );
    } catch (renderError: any) {
        console.error('❌ MapView rendering error, falling back:', renderError);
        return <SimpleMapView latitude={latitude} longitude={longitude} polyline={polyline} stops={stops} />;
    }
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#DC2626',
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        textAlign: 'center',
    },
    errorHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
    },
    markerContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    markerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#2563EB',
    },
    stopMarkerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    stopMarkerText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
