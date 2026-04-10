import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

const LOCATION_TASK_NAME = 'BACKGROUND_BUS_LOCATION_UPDATE';

// Use environment variable for API URL (respects .env settings)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND_URL = `${API_BASE_URL}/api/location`;
const PROD_URL = 'https://smartbus-tracker-z7tn.onrender.com/api/location';

console.log(`🌐 API Base URL: ${API_BASE_URL}`);
console.log(`📍 Location endpoint: ${BACKEND_URL}`);

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
    if (!busId) {
      console.error("Cannot start tracking: No bus ID provided");
      return;
    }

    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      console.log("✅ Location tracking already started");
      return;
    }

    try {
      // Store busId FIRST before starting location updates
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('ACTIVE_BUS_ID', busId);
      
      // Verify it was saved
      const savedBusId = await AsyncStorage.getItem('ACTIVE_BUS_ID');
      if (savedBusId !== busId) {
        console.error("Failed to save bus ID to AsyncStorage");
        return;
      }
      
      console.log(`✅ Bus ID saved: ${busId}`);

      // Optimized settings for reliable background tracking
      // - distanceInterval: 15m for balance between accuracy and battery
      // - deferredUpdatesInterval: 5s to batch updates
      // - pausesUpdatesAutomatically: false to keep tracking when driving
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 15, // Update after moving 15 meters (was 20m)
        deferredUpdatesInterval: 5000, // Wait at least 5 seconds between batches
        foregroundService: {
          notificationTitle: "🚌 SmartBus Driver Active",
          notificationBody: `Sharing location for Bus ${busId}`,
          notificationColor: "#2563EB"
        },
        pausesUpdatesAutomatically: false, // Keep tracking even if device is stationary
        mayShowUserSettingsDialog: true, // Allow user to adjust settings
      });

      console.log(`✅ Background tracking started for ${busId}`);
    } catch (error) {
      console.error("❌ Error starting location tracking:", error);
    }
  },

  async stopTracking() {
    try {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        
        // Clear the bus ID when stopping
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.removeItem('ACTIVE_BUS_ID');
        
        console.log('✅ Background tracking stopped and bus ID cleared');
      }
    } catch (error) {
      console.error("❌ Error stopping location tracking:", error);
    }
  }
};

// Define the background task with comprehensive error handling
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  try {
    if (error) {
      console.error("❌ Background location task error:", error);
      // Don't return - continue to check for data
    }

    if (!data || !data.locations) {
      console.warn("⚠️ No location data received in background task");
      return;
    }

    const { locations } = data;
    if (!locations || locations.length === 0) {
      console.warn("⚠️ Empty locations array");
      return;
    }

    // Get the most recent location
    const location = locations[locations.length - 1];

    if (location && location.coords) {
      try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const busId = await AsyncStorage.getItem('ACTIVE_BUS_ID');
        
        if (!busId) {
          console.warn("⚠️ No active bus ID found - resuming when app returns to foreground");
          return;
        }

        const payload = {
          bus_id: busId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          speed: Math.round((location.coords.speed || 0) * 3.6), // Convert m/s to km/h
          timestamp: new Date(location.timestamp).toISOString()
        };

        // Send to backend
        try {
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            // Add timeout
          });
          
          if (response.ok) {
            console.log(`📍 [BG] ${busId}: ${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)} @ ${payload.speed}km/h`);
          } else {
            console.warn(`⚠️ [BG] Local backend error: ${response.status}, trying production...`);
            throw new Error("Local endpoint failed");
          }
        } catch (localErr) {
          // Fallback to production
          try {
            const response = await fetch(PROD_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (response.ok) {
              console.log(`📍 [BG-PROD] ${busId}: location sent`);
            } else {
              console.warn(`⚠️ [BG] Production backend error: ${response.status}`);
            }
          } catch (prodErr) {
            console.warn(`⚠️ [BG] Could not reach any backend: ${prodErr}`);
          }
        }
      } catch (err) {
        console.error("Error in background task location processing:", err);
      }
    }
  } catch (err) {
    console.error("Critical error in background task:", err);
  }
});
              