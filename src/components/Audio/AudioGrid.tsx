import { RemotePeer } from '../../types';
import AudioPeer from './AudioPeer';

interface AudioGridProps {
  peers: RemotePeer[];
  myName: string;
}

export default function AudioGrid({ peers, myName }: AudioGridProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Self View */}
      <div style={{
        background: 'rgba(25, 28, 35, 0.8)',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid var(--accent)' // Highlight self
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          {myName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {myName} (You)
          </p>
        </div>
      </div>

      {/* Remote Peers */}
      {peers.map(peer => (
        <AudioPeer key={peer.id} peer={peer} />
      ))}
    </div>
  );
}
