import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from '../types';

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message || 'Login failed' };
    }
};

export const registerWithEmail = async (email: string, name: string, password: string, role: 'passenger' | 'driver' = 'passenger') => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: name });

        // Save profile to Firestore
        const collectionName = role === 'driver' ? 'drivers' : 'passengers';
        await setDoc(doc(db, collectionName, user.uid), {
            uid: user.uid,
            name,
            email,
            role
        });

        return { user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message || 'Registration failed' };
    }
};

export const getUserProfile = async (uid: string, role?: 'passenger' | 'driver'): Promise<{ profile: UserProfile | null, error: string | null }> => {
    try {
        if (role) {
            const collectionName = role === 'driver' ? 'drivers' : 'passengers';
            const userDoc = await getDoc(doc(db, collectionName, uid));
            if (userDoc.exists()) {
                return { profile: userDoc.data() as UserProfile, error: null };
            }
        } else {
            // Try both collections if role is unknown
            const driverDoc = await getDoc(doc(db, 'drivers', uid));
            if (driverDoc.exists()) {
                return { profile: driverDoc.data() as UserProfile, error: null };
            }
            const passengerDoc = await getDoc(doc(db, 'passengers', uid));
            if (passengerDoc.exists()) {
                return { profile: passengerDoc.data() as UserProfile, error: null };
            }
        }
        return { profile: null, error: 'User profile not found' };
    } catch (error: any) {
        return { profile: null, error: error.message || 'Error fetching profile' };
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
        return { success: true, error: null };
    } catch (error: any) {
        return { success: false, error: error.message || 'Logout failed' };
    }
};

export const getCurrentUser = () => {
    return auth.currentUser;
};
