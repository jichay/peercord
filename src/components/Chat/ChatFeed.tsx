import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../types';
import { sanitizeAndParseURLs } from '../../utils/parser';

interface ChatFeedProps {
  messages: ChatMessage[];
  currentUsername: string;
}

export default function ChatFeed({ messages, currentUsername }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && target.classList.contains('clickable-image')) {
      setSelectedImage((target as HTMLImageElement).src);
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {messages.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <p>No messages yet. Be the first to say hi!</p>
        </div>
      )}
      
      {messages.map((msg) => {
        const isMe = msg.author === currentUsername;
        return (
          <div key={msg.id} className="animate-fade-in" style={{
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            maxWidth: '70%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMe ? 'flex-end' : 'flex-start'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px', marginRight: '4px' }}>
              {msg.author} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div style={{
              background: isMe ? 'var(--accent)' : 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: '16px',
              borderBottomRightRadius: isMe ? '4px' : '16px',
              borderBottomLeftRadius: !isMe ? '4px' : '16px',
              lineHeight: '1.5',
              wordBreak: 'break-word'
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeAndParseURLs(msg.text) }}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />

      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="animate-fade-in"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            backdropFilter: 'blur(4px)'
          }}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} 
          />
        </div>
      )}
    </div>
  );
}
