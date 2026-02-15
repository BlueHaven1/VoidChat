import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, set, push, remove, get, query, orderByChild, equalTo, update } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const useFriends = () => {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to Friends and Requests
  useEffect(() => {
    if (!currentUser) return;

    // Listen for accepted friends
    const friendsRef = ref(db, `friends/${currentUser.uid}`);
    const unsubscribeFriends = onValue(friendsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Fetch details for each friend
        const friendPromises = Object.keys(data).map(async (friendId) => {
            const userSnap = await get(ref(db, `users/${friendId}`));
            return userSnap.val();
        });
        const friendsData = await Promise.all(friendPromises);
        setFriends(friendsData.filter(f => f)); // Filter nulls
      } else {
        setFriends([]);
      }
    });

    // Listen for incoming requests
    const requestsRef = ref(db, `friendRequests/${currentUser.uid}`);
    const unsubscribeRequests = onValue(requestsRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Fetch sender details
        const requestPromises = Object.entries(data).map(async ([senderId, val]) => {
           if (val.type === 'received') {
               const userSnap = await get(ref(db, `users/${senderId}`));
               return { ...userSnap.val(), uid: senderId, status: val.status };
           }
           return null;
        });
        const requestsData = await Promise.all(requestPromises);
        setRequests(requestsData.filter(r => r));
      } else {
        setRequests([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeFriends();
      unsubscribeRequests();
    };
  }, [currentUser]);

  const sendFriendRequest = async (targetUsername) => {
    if (!currentUser) return { success: false, error: "Not logged in" };
    
    // 1. Find user by username
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('username'), equalTo(targetUsername));
    const snapshot = await get(q);

    if (!snapshot.exists()) {
        throw new Error("User not found");
    }

    const userData = snapshot.val();
    const targetUserId = Object.keys(userData)[0]; // Get first match

    if (targetUserId === currentUser.uid) {
        throw new Error("You cannot add yourself");
    }

    // 2. Check if already friends
    const friendsRef = ref(db, `friends/${currentUser.uid}/${targetUserId}`);
    const friendSnap = await get(friendsRef);
    if (friendSnap.exists()) {
        throw new Error("You are already friends with this user");
    }

    // 3. Check if we already have a pending request (sent or received)
    const requestRef = ref(db, `friendRequests/${currentUser.uid}/${targetUserId}`);
    const requestSnap = await get(requestRef);
    
    if (requestSnap.exists()) {
        const reqData = requestSnap.val();
        if (reqData.type === 'sent') {
            throw new Error("Friend request already sent");
        } else if (reqData.type === 'received') {
            throw new Error("This user has already sent you a request. Check your inbox!");
        }
    }

    // 4. Send Request (Write to both users for 'sent' and 'received' states)
    const updates = {};
    updates[`friendRequests/${targetUserId}/${currentUser.uid}`] = { 
        type: 'received',
        status: 'pending',
        timestamp: Date.now()
    };
    updates[`friendRequests/${currentUser.uid}/${targetUserId}`] = { 
        type: 'sent',
        status: 'pending',
        timestamp: Date.now()
    };

    await update(ref(db), updates);
    return { success: true };
  };

  const acceptFriendRequest = async (senderId) => {
      if (!currentUser) return;
      
      const updates = {};
      // Add to friends list for both
      updates[`friends/${currentUser.uid}/${senderId}`] = true;
      updates[`friends/${senderId}/${currentUser.uid}`] = true;
      
      // Remove requests
      updates[`friendRequests/${currentUser.uid}/${senderId}`] = null;
      updates[`friendRequests/${senderId}/${currentUser.uid}`] = null;
      
      await update(ref(db), updates);
  };

  const rejectFriendRequest = async (senderId) => {
      if (!currentUser) return;
      
      const updates = {};
      // Remove requests (sender and receiver both have entries usually, need to clean up both)
      // The current user has 'received' from senderId
      updates[`friendRequests/${currentUser.uid}/${senderId}`] = null;
      // The sender has 'sent' to currentUser
      updates[`friendRequests/${senderId}/${currentUser.uid}`] = null;
      
      await update(ref(db), updates);
  };

  return { friends, requests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, loading };
};
export default useFriends;
