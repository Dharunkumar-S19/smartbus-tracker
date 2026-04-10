import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getMessaging, isSupported } from 'firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration using environment variables from .env
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

console.log('🔧 Initializing Firebase...');

// Initialize Firebase only once
let app: FirebaseApp;
try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
    } else {
        app = getApp();
        console.log('✅ Firebase app already exists');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
}

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
try {
    if (Platform.OS === 'web') {
        auth = getAuth(app);
        console.log('✅ Firebase Auth initialized (web)');
    } else {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('✅ Firebase Auth initialized with AsyncStorage (native)');
    }
} catch (error: any) {
    if (error.code === 'auth/already-initialized') {
        auth = getAuth(app);
        console.log('✅ Firebase Auth already initialized');
    } else {
        console.error('❌ Firebase Auth error:', error);
        throw error;
    }
}

// Initialize Firestore and Realtime Database
const db = getFirestore(app);
const rtdb = getDatabase(app);
console.log('✅ Firestore and RTDB initialized');

// Initialize Messaging (Firebase Cloud Messaging) specifically for web 
let messaging = null;
if (Platform.OS === 'web') {
    isSupported().then((supported) => {
        if (supported) {
            messaging = getMessaging(app);
            console.log('✅ Firebase Messaging initialized');
        }
    }).catch((error) => {
        console.warn('⚠️ Firebase Messaging not supported:', error);
    });
}

/**
 * Saves an FCM token to the user's Firestore document
 * @param uid The Firebase Auth UID
 * @param token The Expo Push Token or FCM token
 */
export async function saveFCMToken(uid: string, token: string) {
    if (!uid || !token) return;

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            await updateDoc(userRef, {
                fcm_tokens: arrayUnion(token)
            });
        } else {
            await setDoc(userRef, {
                uid: uid,
                fcm_tokens: [token],
                created_at: new Date()
            });
        }
        console.log('✅ FCM token saved');
    } catch (error) {
        console.error('❌ Error saving FCM token:', error);
    }
}

/**
 * Adds a bus ID to the user's tracked_buses array
 * @param uid The Firebase Auth UID
 * @param busId The ID of the bus to track
 */
export async function addTrackedBus(uid: string, busId: string) {
    if (!uid || !busId) return;

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            await updateDoc(userRef, {
                tracked_buses: arrayUnion(busId)
            });
        } else {
            await setDoc(userRef, {
                uid: uid,
                tracked_buses: [busId],
                created_at: new Date()
            });
        }
        console.log('✅ Bus tracked');
    } catch (error) {
        console.error('❌ Error tracking bus:', error);
    }
}

export { app, auth, db, rtdb, messaging };
