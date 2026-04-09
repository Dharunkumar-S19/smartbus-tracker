import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            try {
                if (firebaseUser) {
                    // Fetch user profile from firestore
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        if (mounted) {
                            setUser(docSnap.data() as UserProfile);
                            setIsAuthenticated(true);
                        }
                    } else {
                        // Fallback if profile doesn't exist yet but user is logged in
                        const fallbackUser: UserProfile = {
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email || '',
                            role: 'passenger', // Default role
                        };
                        if (mounted) {
                            setUser(fallbackUser);
                            setIsAuthenticated(true);
                        }
                    }
                } else {
                    // User is not logged in
                    if (mounted) {
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                if (mounted) {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    return {
        user,
        loading,
        isAuthenticated,
    };
};
