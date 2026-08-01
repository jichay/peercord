import { useEffect, useRef, useState } from 'react';
import { RemotePeer } from '../../types';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioPeerProps {
  peer: RemotePeer;
}

export default function AudioPeer({ peer }: AudioPeerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMutedLocally, setIsMutedLocally] = useState(false);

  useEffect(() => {
    if (audioRef.current && peer.stream) {
      audioRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) {
      setIsMutedLocally(true);
    } else if (isMutedLocally) {
      setIsMutedLocally(false);
    }
  };

  const toggleMute = () => {
    const newMuted = !isMutedLocally;
    setIsMutedLocally(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume === 0 ? 1 : volume;
    }
    if (!newMuted && volume === 0) {
      setVolume(1);
    }
  };

  const shortId = peer.id.split('-').pop() || '?';
  const displayName = peer.username || `Peer ${shortId}`;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div style={{
      background: 'rgba(25, 28, 35, 0.4)',
      borderRadius: '12px',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      border: '1px solid var(--border-glass)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          {initial}
        </div>
        <p style={{ flex: 1, fontWeight: 500, fontSize: '14px' }}>
          {displayName}
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={toggleMute}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 0 }}
        >
          {isMutedLocally || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMutedLocally ? 0 : volume}
          onChange={handleVolumeChange}
          style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
      </div>

      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />
    </div>
  );
}
