import React, { useState } from 'react';
import { View, Text } from 'react-native';

interface SafeMapViewProps {
  latitude: number;
  longitude: number;
  polyline?: any;
  stops?: any;
}

export default function SafeMapView(props: SafeMapViewProps) {
  const [error, setError] = useState<string | null>(null);

  try {
    const MapView = require('./MapView').default;
    return <MapView {...props} />;
  } catch (err: any) {
    console.error('MapView error:', err);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', padding: 20 }}>
          Map loading... {err?.message}
        </Text>
      </View>
    );
  }
}
