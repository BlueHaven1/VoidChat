import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, push, remove, update, set } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const useServers = () => {
  const [servers, setServers] = useState([]);
  const { currentUser } = useAuth();
  
  // New state to track server IDs the user is a member of
  const [memberServerIds, setMemberServerIds] = useState([]);

  // 1. Listen for the user's membership list
  useEffect(() => {
    if (!currentUser) {
        setServers([]);
        return;
    }

    const userServersRef = ref(db, `users/${currentUser.uid}/servers`);
    const unsubscribe = onValue(userServersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            setMemberServerIds(Object.keys(data));
        } else {
            setMemberServerIds([]);
            setServers([]);
        }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch server details for each ID
  useEffect(() => {
    if (memberServerIds.length === 0) {
        setServers([]); // Ensure it's cleared if no IDs
        return;
    }

    const unsubscribers = [];
    // We can't easily listen to "all servers where ID in list" in one query.
    // So we listen to each individually. For a small app, this is fine.
    // For scaling, you'd denormalize server data into `users/uid/servers`.
    
    // Simple approach: One-time fetch or individual listeners?
    // Let's use individual listeners to keep it reactive.
    
    // Clear current servers first to avoid stale data mixing? 
    // Actually, let's just build a map.
    const newServersMap = {};

    memberServerIds.forEach(serverId => {
        const serverRef = ref(db, `servers/${serverId}`);
        const unsub = onValue(serverRef, (snapshot) => {
            const serverData = snapshot.val();
            if (serverData) {
                newServersMap[serverId] = { id: serverId, ...serverData };
            } else {
                // Server might have been deleted
                delete newServersMap[serverId];
            }
            // Update state on every change (might flicker, but keeps it simple)
            setServers(Object.values(newServersMap)); 
        });
        unsubscribers.push(unsub);
    });

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [memberServerIds]);

  const createServer = async (name) => {
    if (!currentUser) throw new Error("Must be logged in");
    
    const serversRef = ref(db, 'servers');
    const newServerRef = await push(serversRef);
    const serverId = newServerRef.key;

    // Create default "general" channel
    const channelsRef = ref(db, 'channels');
    const newChannelRef = await push(channelsRef);
    const channelId = newChannelRef.key;

    const channelData = {
        name: "general",
        type: "text",
        guildId: serverId,
        permissions: {
            public: true
        }
    };
    
    await set(newChannelRef, channelData);

    const serverData = {
      name,
      ownerId: currentUser.uid,
      createdAt: new Date().toISOString(),
      icon: null,
      members: {
          [currentUser.uid]: true // owner is a member
      },
      channels: {
          [channelId]: true
      }
    };
    
    // Initialize server
    await set(newServerRef, serverData);
    
    // Link server to user
    const userServerRef = ref(db, `users/${currentUser.uid}/servers/${serverId}`);
    await set(userServerRef, true);
    
    return serverId;
  };

  const deleteServer = async (serverId) => {
    if (!currentUser) throw new Error("Must be logged in");
    const serverRef = ref(db, `servers/${serverId}`);
    // Also remove from user's list (though rules might cascade or we clean up manually)
    // For now, simpler to just remove the server data.
    // In a real app, you'd use Cloud Functions to fan-out delete from all members.
    await remove(serverRef);
    
    // Manually remove from own list
    const userServerRef = ref(db, `users/${currentUser.uid}/servers/${serverId}`);
    await remove(userServerRef);
  };

  const updateServer = async (serverId, updates) => {
    if (!currentUser) throw new Error("Must be logged in");
    const serverRef = ref(db, `servers/${serverId}`);
    await update(serverRef, updates);
  };
  
  const joinServer = async (serverId) => {
      // Logic for invite link
      if (!currentUser) return;
      
      const updates = {};
      updates[`servers/${serverId}/members/${currentUser.uid}`] = true;
      updates[`users/${currentUser.uid}/servers/${serverId}`] = true;
      
      await update(ref(db), updates);
  };

  const leaveServer = async (serverId) => {
      if (!currentUser) return;

      const updates = {};
      updates[`servers/${serverId}/members/${currentUser.uid}`] = null;
      updates[`users/${currentUser.uid}/servers/${serverId}`] = null;

      await update(ref(db), updates);
  };

  return {
    servers,
    createServer,
    deleteServer,
    updateServer,
    joinServer,
    leaveServer
  };
};
