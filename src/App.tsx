import { useState } from 'react';
import Home from './components/Home/Home';
import Room from './components/Room/Room';
import './index.css';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');

  const handleJoin = (code: string, name: string) => {
    setRoomId(code);
    setUsername(name);
  };

  const handleLeave = () => {
    setRoomId(null);
  };

  return (
    <div className="app-container">
      {!roomId ? (
        <Home onJoin={handleJoin} />
      ) : (
        <Room roomId={roomId} username={username} onLeave={handleLeave} />
      )}
    </div>
  );
}
