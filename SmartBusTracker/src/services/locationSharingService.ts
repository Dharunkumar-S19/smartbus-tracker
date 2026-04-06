import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'BACKGROUND_BUS_LOCATION_UPDATE';
const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/location' : 'http://localhost:8000/api/location';
const PROD_URL = 'https://smartbus-tracker-z7tn.onrender.com/api/location';

export const LocationSharingService = {
  async requestPermissions() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, error: 'Foreground location permission denied' };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return { success: false, error: 'Background location permission denied. Please set location to "Always" in your settings.' };
    }

    return { success: true };
  },

  async startTracking(busId: string) {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) return;

    // Use adaptive settings for battery efficiency (Uber/Zomato style)
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Use Balanced for battery, or High for better tracking
      distanceInterval: 20, // Update only after moving 20 meters
      deferredUpdatesInterval: 5000, // Wait at least 5 seconds between updates
      foregroundService: {
        notificationTitle: "SmartBus Driver Active",
        notificationBody: `Sharing location for Bus ${busId}`,
        notificationColor: "#007AFF"
      },
      pausesUpdatesAutomatically: true, // Stop when the driver stops moving
    });

    // Store busId for the task to use
    // We can use a global or storage, but for now we'll pass it in the task data if possible
    // Actually, background tasks can't easily access React state, so we use AsyncStorage or similar.
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('ACTIVE_BUS_ID', busId);
    
    console.log(`Tracking started for ${busId}`);
  },

  async stopTracking() {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Tracking stopped');
    }
  }
};

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const busId = await AsyncStorage.getItem('ACTIVE_BUS_ID');
        
        if (!busId) return;

        // Send to backend
        try {
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bus_id: busId,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              speed: Math.round((location.coords.speed || 0) * 3.6), // Convert m/s to km/h
              timestamp: new Date(location.timestamp).toISOString()
            })
          });
          if (!response.ok) throw new Error("Local failed");
        } catch (localErr) {
          // Fallback to production
          await fetch(PROD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bus_id: busId,
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              speed: Math.round((location.coords.speed || 0) * 3.6),
              timestamp: new Date(location.timestamp).toISOString()
            })
          });
        }
      } catch (err) {
        console.warn("Failed to send background location update", err);
      }
    }
  }
});
