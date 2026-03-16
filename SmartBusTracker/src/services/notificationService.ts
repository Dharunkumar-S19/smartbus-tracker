import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
    static async requestNotificationPermission(): Promise<boolean> {
        if (Platform.OS === 'web') return false; // Native only capabilities mainly

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    }

    static async setupNotificationChannel() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('bus_alerts', {
                name: 'Bus Arrival Alerts',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#2563EB',
            });
        }
    }

    static async scheduleArrivalNotification(busName: string, stopName: string, etaMinutes: number) {
        if (etaMinutes > 3) return; // Only notify if close

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "🚌 Bus Arriving Soon!",
                body: `${busName} arriving at ${stopName} in ${etaMinutes} minutes`,
                data: { busName, stopName, etaMinutes },
            },
            trigger: null, // trigger immediately locally
        });
    }

    static async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
}
