import { Mic, MicOff, LogOut } from 'lucide-react';

interface ControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onLeave: () => void;
}

export default function Controls({ isMuted, onToggleMute, onLeave }: ControlsProps) {
  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      background: 'rgba(0, 0, 0, 0.2)'
    }}>
      <button 
        onClick={onToggleMute}
        className="btn" 
        style={{ 
          flex: 1, 
          backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        {isMuted ? 'Muted' : 'Unmuted'}
      </button>
      
      <button 
        onClick={onLeave}
        className="btn btn-danger" 
        style={{ padding: '10px' }}
        title="Leave Room"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
