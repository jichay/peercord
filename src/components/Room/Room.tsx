import { useRoom } from '../../hooks/useRoom';
import { useChat } from '../../hooks/useChat';
import ChatFeed from '../Chat/ChatFeed';
import ChatInput from '../Chat/ChatInput';
import AudioGrid from '../Audio/AudioGrid';
import Controls from '../Audio/Controls';
import { Loader } from 'lucide-react';
import { useState } from 'react';

interface RoomProps {
  roomId: string;
  username: string;
  onLeave: () => void;
}

export default function Room({ roomId, username, onLeave }: RoomProps) {
  const { connectionState, peers, manager, error } = useRoom(roomId, username);
  const { messages, sendMessage } = useChat(roomId, manager, username);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (manager) {
      manager.toggleMute(newState);
    }
  };

  if (connectionState === 'connecting') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <Loader className="animate-spin" size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
        <p>Connecting to decentralized mesh...</p>
      </div>
    );
  }

  if (connectionState === 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: 'var(--danger)' }}>Connection Error</h2>
        <p>{error?.message}</p>
        <button className="btn" onClick={onLeave}>Return Home</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', padding: '16px', gap: '16px' }}>
      {/* Sidebar for Voice & Peers */}
      <div className="glass-panel" style={{ 
        width: '280px', 
        borderRadius: '16px', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Room: {roomId}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{peers.length + 1} connected</p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <AudioGrid peers={peers} myName={username} />
        </div>
        
        <Controls isMuted={isMuted} onToggleMute={handleToggleMute} onLeave={onLeave} />
      </div>
      
      {/* Main Chat Area */}
      <div className="glass-panel" style={{ 
        flex: 1, 
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <ChatFeed messages={messages} currentUsername={username} />
        <ChatInput onSendMessage={sendMessage} />
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
