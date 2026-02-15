import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { ref, onValue, push, set, remove, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

export const useChat = (channelId) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Typing state
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // 1. Listen for Messages
  useEffect(() => {
    if (!channelId) {
        setMessages([]);
        return;
    }

    const messagesRef = ref(db, `channels/${channelId}/messages`);
    const q = query(messagesRef, orderByChild('timestamp'), limitToLast(50));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelId]);

  // 2. Listen for Typing Status
  useEffect(() => {
    if (!channelId) {
        setTypingUsers([]);
        return;
    }

    const typingRef = ref(db, `channels/${channelId}/typing`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Convert to array of names, excluding self
            const names = Object.entries(data)
                .filter(([uid]) => uid !== currentUser?.uid) 
                .map(([_, val]) => val.username);
            setTypingUsers(names);
        } else {
            setTypingUsers([]);
        }
    });

    return () => unsubscribe();
  }, [channelId, currentUser]);

  const sendMessage = async (text, attachment = null) => {
    if (!currentUser || !channelId || (!text.trim() && !attachment)) return;

    // Clear typing status immediately upon send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const typingRef = ref(db, `channels/${channelId}/typing/${currentUser.uid}`);
    await remove(typingRef);

    const messagesRef = ref(db, `channels/${channelId}/messages`);
    const messageData = {
      text: text || '',
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email,
      senderPhoto: currentUser.photoURL,
      timestamp: serverTimestamp(),
    };

    if (attachment) {
      messageData.attachment = attachment;
    }

    await push(messagesRef, messageData);
  };

  const handleTyping = async () => {
      if (!currentUser || !channelId) return;

      // Set typing to true
      const typingRef = ref(db, `channels/${channelId}/typing/${currentUser.uid}`);
      await set(typingRef, {
          username: currentUser.displayName || currentUser.email,
          timestamp: serverTimestamp()
      });

      // Reset timeout to clear typing status
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
          await remove(typingRef);
      }, 3000); // 3 seconds timeout
  };

  const deleteMessage = async (messageId) => {
      if (!channelId || !messageId) return;
      const messageRef = ref(db, `channels/${channelId}/messages/${messageId}`);
      await remove(messageRef);
  };

  return { messages, sendMessage, deleteMessage, loading, typingUsers, handleTyping };
};
