import { ChatMessage } from '../types';

/**
 * Fusionne deux historiques de messages en supprimant les doublons (via l'ID)
 * et en les triant par timestamp.
 */
export function mergeHistories(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  
  for (const msg of local) {
    map.set(msg.id, msg);
  }
  
  for (const msg of remote) {
    if (!map.has(msg.id)) {
      map.set(msg.id, msg);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}
