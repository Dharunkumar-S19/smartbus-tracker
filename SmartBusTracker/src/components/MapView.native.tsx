import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapViewMobileProps {
    latitude: number;
    longitude: number;
    routeCoordinates?: [number, number][]; // Array of [longitude, latitude]
}

export default function MapViewMobile({ latitude, longitude, routeCoordinates }: MapViewMobileProps) {
    // Convert [long, lat] to {latitude: lat, longitude: long} for Polyline
    const formattedRoute = routeCoordinates?.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
    })) || [];

    return (
        <View style={styles.container}>
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                region={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {formattedRoute.length > 0 && (
                    <Polyline
                        coordinates={formattedRoute}
                        strokeColor="#2563EB"
                        strokeWidth={4}
                    />
                )}

                <Marker
                    coordinate={{ latitude, longitude }}
                    anchor={{ x: 0.5, y: 0.5 }}
                >
                    <View style={styles.markerContainer}>
                        <View style={styles.markerInner} />
                    </View>
                </Marker>
            </MapView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(37, 99, 235, 0.3)', // #2563EB with opacity
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
    }
});
