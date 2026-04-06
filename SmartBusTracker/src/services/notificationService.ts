// import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export class NotificationService {
    static async requestNotificationPermission(): Promise<boolean> {
        return false; // Disabled for Expo Go
        /*
        if (Platform.OS === 'web') return false;
        
        // Skip if in Expo Go (SDK 53+ does not support push notifications in Expo Go)
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
            console.warn('Push notifications are not supported in Expo Go for this version of Expo SDK.');
            return false;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            return finalStatus === 'granted';
        } catch (error) {
            console.warn('Error requesting notification permission:', error);
            return false;
        }
        */
    }

    static async setupNotificationChannel() {
        // Disabled for Expo Go
        /*
        if (Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
            try {
                await Notifications.setNotificationChannelAsync('bus_alerts', {
                    name: 'Bus Arrival Alerts',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: 'default',
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#2563EB',
                });
            } catch (error) {
                console.warn('Error setting up notification channel:', error);
            }
        }
        */
    }

    static async scheduleArrivalNotification(busName: string, stopName: string, etaMinutes: number) {
        // Disabled for Expo Go
        /*
        if (etaMinutes > 3) return; // Only notify if close
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "🚌 Bus Arriving Soon!",
                    body: `${busName} arriving at ${stopName} in ${etaMinutes} minutes`,
                    data: { busName, stopName, etaMinutes },
                },
                trigger: null, // trigger immediately locally
            });
        } catch (error) {
            console.warn('Error scheduling notification:', error);
        }
        */
    }

    static async cancelAllNotifications() {
        // Disabled for Expo Go
        /*
        if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
        
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.warn('Error cancelling notifications:', error);
        }
        */
    }
}
