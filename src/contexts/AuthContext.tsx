import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isStudent: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  role: null,
  isAdmin: false,
  isStudent: false,
  isTeacher: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        const userDoc = await getDoc(doc(db, 'users', fUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // If user exists in Auth but not in Firestore (e.g. first time login)
          // This should ideally be handled in signup, but for safety:
          const newUser: User = {
            uid: fUser.uid,
            id: fUser.email?.split('@')[0] || '', // Extract ID from internal email
            name: fUser.displayName || 'New User',
            email: fUser.email || '',
            role: fUser.email === 'admin@college.edu' ? 'admin' : 'student', // Default role with admin safety net
            isBlocked: false,
            createdAt: new Date(),
          };
          await setDoc(doc(db, 'users', fUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    isTeacher: user?.role === 'teacher',
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
