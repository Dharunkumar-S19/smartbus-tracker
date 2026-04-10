import React from 'react';
import { StyleSheet, View, Text, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Coordinate {
    lat: number;
    lng: number;
}

interface StopMarker {
    name: string;
    lat: number;
    lng: number;
}

interface SimpleMapViewProps {
    latitude: number;
    longitude: number;
    polyline?: Coordinate[];
    stops?: StopMarker[];
}

const { width, height } = Dimensions.get('window');

export default function SimpleMapView({ latitude, longitude, polyline, stops }: SimpleMapViewProps) {
    console.log('🗺️ SimpleMapView (Fallback) rendering:', { 
        latitude, 
        longitude, 
        hasPolyline: !!polyline,
        polylinePoints: polyline?.length || 0,
        hasStops: !!stops,
        stopsCount: stops?.length || 0
    });

    return (
        <View style={styles.container}>
            {/* Map Background with Grid */}
            <View style={styles.mapBackground}>
                {/* Grid lines */}
                <View style={styles.gridContainer}>
                    {[...Array(10)].map((_, i) => (
                        <View key={`h-${i}`} style={[styles.gridLine, { top: `${i * 10}%` }]} />
                    ))}
                    {[...Array(10)].map((_, i) => (
                        <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineVertical, { left: `${i * 10}%` }]} />
                    ))}
                </View>

                {/* Polyline visualization */}
                {polyline && polyline.length > 0 && (
                    <View style={styles.polylineIndicator}>
                        <View style={styles.polylinePath} />
                        <Text style={styles.polylineText}>
                            Route Path: {polyline.length} points
                        </Text>
                    </View>
                )}

                {/* Center marker (bus location) */}
                <View style={styles.centerMarker}>
                    <View style={styles.markerPulse} />
                    <Ionicons name="bus" size={32} color="#2563EB" />
                </View>

                {/* Location info overlay */}
                <View style={styles.infoOverlay}>
                    <View style={styles.infoCard}>
                        <Ionicons name="location" size={20} color="#2563EB" />
                        <View style={styles.infoText}>
                            <Text style={styles.infoLabel}>Current Location</Text>
                            <Text style={styles.infoCoords}>
                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </Text>
                        </View>
                    </View>

                    {stops && stops.length > 0 && (
                        <View style={[styles.infoCard, { marginTop: 8 }]}>
                            <Ionicons name="flag" size={20} color="#F59E0B" />
                            <View style={styles.infoText}>
                                <Text style={styles.infoLabel}>Route Stops</Text>
                                <Text style={styles.infoCoords}>{stops.length} stops</Text>
                            </View>
                        </View>
                    )}

                    {polyline && polyline.length > 0 && (
                        <View style={[styles.infoCard, { marginTop: 8 }]}>
                            <Ionicons name="git-branch" size={20} color="#10B981" />
                            <View style={styles.infoText}>
                                <Text style={styles.infoLabel}>Route Path</Text>
                                <Text style={styles.infoCoords}>{polyline.length} points</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Notice banner */}
                <View style={styles.noticeBanner}>
                    <Ionicons name="information-circle" size={20} color="#2563EB" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.noticeText}>
                            {polyline && polyline.length > 0 
                                ? `Route loaded with ${polyline.length} points` 
                                : 'Full interactive map requires development build'}
                        </Text>
                        {polyline && polyline.length > 0 && (
                            <Text style={[styles.noticeText, { fontSize: 11, marginTop: 2 }]}>
                                Build dev client for interactive map
                            </Text>
                        )}
                    </View>
                </View>

                {/* Compass */}
                <View style={styles.compass}>
                    <Text style={styles.compassText}>N</Text>
                    <Ionicons name="arrow-up" size={24} color="#666" />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8F4F8',
    },
    mapBackground: {
        flex: 1,
        backgroundColor: '#E8F4F8',
        position: 'relative',
    },
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#2563EB',
    },
    gridLineVertical: {
        top: 0,
        bottom: 0,
        width: 1,
        height: '100%',
    },
    polylineIndicator: {
        position: 'absolute',
        top: '30%',
        left: '10%',
        right: '10%',
        alignItems: 'center',
    },
    polylinePath: {
        width: '100%',
        height: 4,
        backgroundColor: '#3B82F6',
        borderRadius: 2,
        opacity: 0.7,
    },
    polylineText: {
        marginTop: 8,
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '600',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    centerMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -32,
        marginLeft: -32,
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerPulse: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        borderWidth: 2,
        borderColor: '#2563EB',
    },
    infoOverlay: {
        position: 'absolute',
        top: 20,
        left: 16,
        right: 16,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoText: {
        marginLeft: 12,
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    infoCoords: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    noticeBanner: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.95)',
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    noticeText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#ffffff',
        fontWeight: '500',
        flex: 1,
    },
    compass: {
        position: 'absolute',
        top: 20,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    compassText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#DC2626',
        position: 'absolute',
        top: 4,
    },
});
