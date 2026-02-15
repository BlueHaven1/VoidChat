import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, push, set, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const useChannels = (serverId) => {
  const [channels, setChannels] = useState([]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!serverId) {
        setChannels([]);
        return;
    }

    const channelsRef = ref(db, 'channels');
    // Query channels belonging to this server
    const q = query(channelsRef, orderByChild('guildId'), equalTo(serverId));

    const unsubscribe = onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const list = Object.entries(data).map(([id, val]) => ({
                id,
                ...val
            }));
            // Sort: General first, then alphabetical
            setChannels(list.sort((a, b) => {
                if (a.name === 'general') return -1;
                if (b.name === 'general') return 1;
                return a.name.localeCompare(b.name);
            }));
        } else {
            setChannels([]);
        }
    });

    return () => unsubscribe();
  }, [serverId]);

  const createChannel = async (name, type = 'text') => {
      if (!currentUser || !serverId) return;

      const channelsRef = ref(db, 'channels');
      const newChannelRef = push(channelsRef);
      const channelId = newChannelRef.key;

      const channelObj = {
          name: name.toLowerCase().replace(/\s+/g, '-'), // slugify
          type,
          guildId: serverId,
          createdAt: {
              ".sv": "timestamp"
          },
          permissions: {
              public: true
          }
      };

      try {
        // 1. Create the channel first
        await set(newChannelRef, channelObj);
        
        // Note: We don't need to link to server explicitly if we query by guildId
        
        return channelId;
      } catch (error) {
        console.error("Error creating channel:", error);
        throw error;
      }
  };

  return { channels, createChannel };
};
