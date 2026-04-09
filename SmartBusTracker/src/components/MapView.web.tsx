import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';

interface Coordinate {
    lat: number;
    lng: number;
}

interface StopMarker {
    name: string;
    lat: number;
    lng: number;
}

interface MapViewWebProps {
    latitude: number;
    longitude: number;
    polyline?: Coordinate[];
    stops?: StopMarker[];
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

export default function MapViewWeb({ latitude, longitude, polyline, stops }: MapViewWebProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const center = useMemo(() => ({
        lat: latitude,
        lng: longitude
    }), [latitude, longitude]);

    const validStops = stops && Array.isArray(stops)
        ? stops.filter(stop => stop && stop.lat && stop.lng && stop.name)
        : [];

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
                {polyline && polyline.length > 0 && (
                    <PolylineF
                        path={polyline}
                        options={{
                            strokeColor: '#3B82F6',
                            strokeOpacity: 0.8,
                            strokeWeight: 6,
                            geodesic: true,
                        }}
                    />
                )}
                
                {validStops.length > 0 && validStops.map((stop, index) => (
                    <MarkerF
                        key={`stop-${index}`}
                        position={{ lat: stop.lat, lng: stop.lng }}
                        title={stop.name}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#F59E0B',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                            scale: 14,
                        }}
                        label={{
                            text: `${index + 1}`,
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                        }}
                    />
                ))}
                
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
