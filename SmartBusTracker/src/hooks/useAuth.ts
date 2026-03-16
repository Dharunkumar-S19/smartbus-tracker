import { useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
            try {
                if (firebaseUser) {
                    // Fetch user profile from firestore
                    const docRef = doc(db, 'users', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setUser(docSnap.data() as UserProfile);
                    } else {
                        // Fallback if profile doesn't exist yet but user is logged in
                        setUser({
                            uid: firebaseUser.uid,
                            name: firebaseUser.displayName || 'User',
                            email: firebaseUser.email || '',
                        });
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return {
        user,
        loading,
        isAuthenticated: !!user,
    };
};
