import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapViewWebProps {
    latitude: number;
    longitude: number;
}

export default function MapViewWeb({ latitude, longitude }: MapViewWebProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const marker = useRef<maplibregl.Marker | null>(null);

    useEffect(() => {
        if (!mapContainer.current) return;

        if (!map.current) {
            // Initialize map on first load
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: {
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
                },
                center: [longitude, latitude],
                zoom: 14,
            });

            // Create a custom DOM element for the marker to match mobile style
            const el = document.createElement('div');
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = 'rgba(37, 99, 235, 0.3)';
            el.style.border = '2px solid #ffffff';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';

            const innerEl = document.createElement('div');
            innerEl.style.width = '12px';
            innerEl.style.height = '12px';
            innerEl.style.borderRadius = '50%';
            innerEl.style.backgroundColor = '#2563EB';

            el.appendChild(innerEl);

            // Add marker to map
            marker.current = new maplibregl.Marker({ element: el })
                .setLngLat([longitude, latitude])
                .addTo(map.current);
        } else {
            // Update map center and marker position when props change
            map.current.flyTo({
                center: [longitude, latitude],
                zoom: 14,
                speed: 1.5,
            });

            if (marker.current) {
                marker.current.setLngLat([longitude, latitude]);
            }
        }

        return () => {
            // Cleanup map on unmount
            if (map.current) {
                // We generally don't destroy it to avoid re-render flashing if possible,
                // but it's good practice
                // map.current.remove(); 
            }
        };
    }, [latitude, longitude]);

    return (
        <View style={styles.container}>
            {/* @ts-ignore - Rendering a div using React Native Web allows ref attachment */}
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
});
