import { describe, it, expect } from 'vitest';
import { mergeHistories } from './messageSync';
import { ChatMessage } from '../types';

describe('mergeHistories', () => {
  it('should merge and sort messages by timestamp', () => {
    const local: ChatMessage[] = [
      { id: '1', text: 'Hello', author: 'A', timestamp: 100 },
      { id: '2', text: 'World', author: 'B', timestamp: 300 },
    ];
    const remote: ChatMessage[] = [
      { id: '1', text: 'Hello', author: 'A', timestamp: 100 }, // Duplicate
      { id: '3', text: '!', author: 'C', timestamp: 200 }, // Interleaved
    ];

    const result = mergeHistories(local, remote);
    
    expect(result.length).toBe(3);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('2');
  });
});
