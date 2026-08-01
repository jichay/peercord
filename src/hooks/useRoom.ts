import { useState, useEffect, useRef } from 'react';
import { RoomManager } from '../network/RoomManager';
import { RemotePeer } from '../types';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useRoom(roomId: string | null, username: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const managerRef = useRef<RoomManager | null>(null);

  useEffect(() => {
    if (!roomId) return;

    setConnectionState('connecting');
    setError(null);

    const manager = new RoomManager(roomId, username);
    managerRef.current = manager;

    manager.onConnected = () => {
      setConnectionState('connected');
    };

    manager.onError = (err) => {
      setError(err);
      setConnectionState('error');
    };

    manager.onPeersChange = (newPeers) => {
      setPeers(newPeers);
    };

    manager.connect();

    return () => {
      manager.disconnect();
      managerRef.current = null;
      setConnectionState('disconnected');
      setPeers([]);
    };
  }, [roomId]);

  return { connectionState, error, peers, manager: managerRef.current };
}
