import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message || 'Login failed' };
    }
};

export const registerWithEmail = async (email: string, name: string, password: string) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile
        await updateProfile(user, { displayName: name });

        // Save profile to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name,
            email
        });

        return { user, error: null };
    } catch (error: any) {
        return { user: null, error: error.message || 'Registration failed' };
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
