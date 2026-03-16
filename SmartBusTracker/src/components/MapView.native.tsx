import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

// Set access token if needed, or null if using purely open OSM tiles without Mapbox/MapTiler keys
MapLibreGL.setAccessToken(null);

interface MapViewMobileProps {
    latitude: number;
    longitude: number;
}

const OSM_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
        },
    },
    layers: [
        {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
        },
    ],
};

export default function MapViewMobile({ latitude, longitude }: MapViewMobileProps) {
    useEffect(() => {
        // Optionally setup any MapLibre configuration on mount
    }, []);

    return (
        <View style={styles.container}>
            <MapLibreGL.MapView
                style={styles.map}
                mapStyle={JSON.stringify(OSM_STYLE)}
                logoEnabled={false}
            >
                <MapLibreGL.Camera
                    zoomLevel={14}
                    centerCoordinate={[longitude, latitude]}
                    animationMode="flyTo"
                    animationDuration={1000}
                />

                <MapLibreGL.PointAnnotation
                    id="user-location"
                    coordinate={[longitude, latitude]}
                >
                    <View style={styles.markerContainer}>
                        <View style={styles.markerInner} />
                    </View>
                </MapLibreGL.PointAnnotation>
            </MapLibreGL.MapView>
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
