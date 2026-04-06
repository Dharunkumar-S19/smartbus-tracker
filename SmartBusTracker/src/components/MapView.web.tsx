import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';

interface MapViewWebProps {
    latitude: number;
    longitude: number;
    routeCoordinates?: [number, number][]; // Array of [longitude, latitude]
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

export default function MapViewWeb({ latitude, longitude, routeCoordinates }: MapViewWebProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const center = useMemo(() => ({
        lat: latitude,
        lng: longitude
    }), [latitude, longitude]);

    const path = useMemo(() => {
        return routeCoordinates?.map(coord => ({
            lat: coord[1],
            lng: coord[0]
        })) || [];
    }, [routeCoordinates]);

    if (!isLoaded) return <View style={styles.container} />;

    return (
        <View style={styles.container}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                }}
            >
                {path.length > 0 && (
                    <PolylineF
                        path={path}
                        options={{
                            strokeColor: "#2563EB",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                        }}
                    />
                )}
                
                <MarkerF
                    position={center}
                    icon={isLoaded && window.google ? {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#2563EB',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 6,
                    } : undefined}
                />
            </GoogleMap>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
});
