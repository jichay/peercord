import { useState, useEffect, useCallback } from 'react';
import { RoomManager } from '../network/RoomManager';
import { ChatMessage, PeerMessage } from '../types';
import { mergeHistories } from '../utils/messageSync';
import { v4 as uuidv4 } from 'uuid';

const getStorageKey = (roomId: string) => `peercord_history_${roomId}`;

export function useChat(roomId: string | null, manager: RoomManager | null, authorName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load from local storage initially
  useEffect(() => {
    if (!roomId) return;
    const stored = localStorage.getItem(getStorageKey(roomId));
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse local history");
      }
    } else {
      setMessages([]);
    }
  }, [roomId]);

  // Handle incoming data
  useEffect(() => {
    if (!manager || !roomId) return;

    manager.onData = (data: PeerMessage) => {
      if (data.type === 'CHAT') {
        setMessages((prev) => {
          const newHistory = mergeHistories(prev, [data.message]);
          if (newHistory.length === prev.length) return prev;
          localStorage.setItem(getStorageKey(roomId), JSON.stringify(newHistory));
          return newHistory;
        });
      } else if (data.type === 'SYNC_REQUEST') {
        // Send our history
        const currentMessages = JSON.parse(localStorage.getItem(getStorageKey(roomId)) || '[]');
        manager.broadcast({ type: 'SYNC_RESPONSE', history: currentMessages });
      } else if (data.type === 'SYNC_RESPONSE') {
        // Merge received history
        setMessages((prev) => {
          const newHistory = mergeHistories(prev, data.history);
          if (newHistory.length === prev.length) return prev;
          localStorage.setItem(getStorageKey(roomId), JSON.stringify(newHistory));
          return newHistory;
        });
      }
    };

    // When successfully connected to the room, ask for history
    const prevOnConnected = manager.onConnected;
    manager.onConnected = () => {
      if (prevOnConnected) prevOnConnected();
      // Wait a little bit to ensure connections to other peers are established before requesting sync
      setTimeout(() => {
        manager.broadcast({ type: 'SYNC_REQUEST' });
      }, 1000);
    };

    return () => {
      manager.onData = undefined;
    };
  }, [manager, roomId]);

  const sendMessage = useCallback((text: string) => {
    if (!manager || !roomId || !text.trim()) return;

    const msg: ChatMessage = {
      id: uuidv4(),
      text,
      author: authorName,
      timestamp: Date.now(),
    };

    // Update local state
    setMessages((prev) => {
      const newHistory = mergeHistories(prev, [msg]);
      localStorage.setItem(getStorageKey(roomId), JSON.stringify(newHistory));
      return newHistory;
    });

    // Broadcast
    manager.broadcast({ type: 'CHAT', message: msg });
  }, [manager, roomId, authorName]);

  return { messages, sendMessage };
}
