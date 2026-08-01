import { useState } from 'react';
import { Users, Dices, Copy, Check } from 'lucide-react';

interface HomeProps {
  onJoin: (roomId: string, username: string) => void;
}

export default function Home({ onJoin }: HomeProps) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');

  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && username.trim()) {
      onJoin(roomCode.trim().toUpperCase(), username.trim());
    }
  };

  const generateRoom = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(result);
  };

  const copyRoom = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        padding: '40px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div className="btn-icon" style={{ backgroundColor: 'rgba(88, 101, 242, 0.2)' }}>
            <Users size={32} color="var(--accent)" />
          </div>
        </div>
        
        <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
          Welcome to Peercord
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Hostless, decentralized voice & text rooms.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            maxLength={32}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Room Code (e.g. ALPHA)"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              required
              maxLength={10}
              style={{ textTransform: 'uppercase', flex: 1 }}
            />
            <button type="button" onClick={generateRoom} className="btn-icon" title="Generate Room Code" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
              <Dices size={20} color="var(--text-primary)" />
            </button>
            <button type="button" onClick={copyRoom} className="btn-icon" title="Copy Room Code" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}>
              {copied ? <Check size={20} color="var(--accent)" /> : <Copy size={20} color="var(--text-primary)" />}
            </button>
          </div>
          
          <button type="submit" className="btn" style={{ marginTop: '16px', padding: '12px' }}>
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
