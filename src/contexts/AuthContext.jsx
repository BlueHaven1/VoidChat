import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  const signup = async (email, password, username) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's profile with the username
    await updateProfile(user, {
      displayName: username
    });

    // Create user record in Realtime Database
    await set(ref(db, 'users/' + user.uid), {
      uid: user.uid,
      email: user.email,
      username: username,
      createdAt: new Date().toISOString(),
      photoURL: user.photoURL || null,
    });

    return user;
  };

  // Login function
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Logout function
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch additional user data from Realtime Database to ensure we have the username
        try {
            const snapshot = await get(ref(db, `users/${user.uid}`));
            if (snapshot.exists()) {
                const userData = snapshot.val();
                // Merge auth user object with db data (db data takes precedence for username)
                const mergedUser = { 
                    ...user, 
                    ...userData,
                    displayName: userData.username || user.displayName 
                };
                setCurrentUser(mergedUser);
            } else {
                setCurrentUser(user);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
