import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

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
    const validStops = stops && Array.isArray(stops) 
        ? stops.filter(stop => stop && stop.lat && stop.lng && stop.name) 
        : [];

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
        >
            {polyline && polyline.length > 0 && (
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
            
            {validStops.length > 0 && validStops.map((stop, index) => (
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
            
            <Marker
                coordinate={{ latitude, longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
            >
                <View style={styles.markerContainer}>
                    <View style={styles.markerInner} />
                </View>
            </Marker>
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
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
