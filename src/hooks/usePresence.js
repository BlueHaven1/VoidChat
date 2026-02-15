import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const usePresence = () => {
  const { currentUser } = useAuth();
  const [userStatuses, setUserStatuses] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  // 1. Set own presence and handle disconnect
  useEffect(() => {
    if (!currentUser) return;

    const userStatusRef = ref(db, `status/${currentUser.uid}`);
    
    // Get stored local preference, default to 'online'
    const storedStatus = localStorage.getItem('voidchat_status_preference');
    const initialStatus = storedStatus || 'online';

    // Set initial status (respecting preference)
    set(userStatusRef, {
      state: initialStatus,
      last_changed: serverTimestamp(),
    });

    // Set offline when disconnected
    onDisconnect(userStatusRef).set({
      state: 'offline',
      last_changed: serverTimestamp(),
    });

    return () => {
        onDisconnect(userStatusRef).cancel();
    };
  }, [currentUser]);

  // 2. Fetch all users and their statuses
  useEffect(() => {
    // Listen to 'users' for profile info
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const usersList = Object.entries(data).map(([uid, val]) => ({
                uid,
                ...val
            }));
            setAllUsers(usersList);
        } else {
            setAllUsers([]);
        }
    });

    // Listen to 'status' for online/offline state
    const statusRef = ref(db, 'status');
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setUserStatuses(data);
        } else {
            setUserStatuses({});
        }
    });

    return () => {
        unsubscribeUsers();
        unsubscribeStatus();
    }
  }, []);

  // 3. Initial Setup helper (to be called on demand if needed)
  const setStatus = (status) => {
      if (!currentUser) return;
      
      // Save preference
      localStorage.setItem('voidchat_status_preference', status);

      const userStatusRef = ref(db, `status/${currentUser.uid}`);
      set(userStatusRef, {
          state: status,
          last_changed: serverTimestamp(),
      });
  };

  return {
      userStatuses,
      allUsers,
      setStatus
  };
};
