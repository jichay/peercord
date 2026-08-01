import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div style={{ padding: '24px', borderTop: '1px solid var(--border-glass)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          style={{ flex: 1, backgroundColor: 'rgba(25, 28, 35, 0.8)' }}
          placeholder="Message the room..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn" disabled={!text.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
