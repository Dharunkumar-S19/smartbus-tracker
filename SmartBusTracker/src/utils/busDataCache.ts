import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedBusData {
  busId: string;
  polyline: Array<{ lat: number; lng: number }>;
  stops: Array<any>;
  cachedAt: number;
}

const CACHE_KEY_PREFIX = 'bus_details_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

export const BusDataCache = {
  /**
   * Get cached bus data if available and not expired
   */
  async get(busId: string) {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${busId}`);
      if (!cached) return null;

      const data: CachedBusData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - data.cachedAt > CACHE_DURATION) {
        // Clear expired cache
        await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${busId}`);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error reading cache:', error);
      return null;
    }
  },

  /**
   * Save bus data to cache
   */
  async set(busId: string, polyline: any[], stops: any[]) {
    try {
      const data: CachedBusData = {
        busId,
        polyline,
        stops,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${busId}`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.warn('Error saving cache:', error);
    }
  },

  /**
   * Clear cache for a specific bus
   */
  async clear(busId: string) {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${busId}`);
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  },

  /**
   * Clear all cached bus data
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const busCacheKeys = keys.filter((key) =>
        key.startsWith(CACHE_KEY_PREFIX)
      );
      await AsyncStorage.multiRemove(busCacheKeys);
    } catch (error) {
      console.warn('Error clearing all cache:', error);
    }
  },
};
