export type ChatMessage = {
  id: string; // UUID
  text: string;
  author: string;
  timestamp: number;
};

export type SyncRequest = { type: 'SYNC_REQUEST' };
export type SyncResponse = { type: 'SYNC_RESPONSE'; history: ChatMessage[] };
export type ChatEvent = { type: 'CHAT'; message: ChatMessage };
export type AnnounceEvent = { type: 'ANNOUNCE'; username: string };
export type LeaveEvent = { type: 'LEAVE'; peerId: string };
export type HeartbeatEvent = { type: 'HEARTBEAT'; peerId: string };

export type PeerMessage = SyncRequest | SyncResponse | ChatEvent | AnnounceEvent | LeaveEvent | HeartbeatEvent;

export interface RemotePeer {
  id: string;
  username?: string;
  stream?: MediaStream;
}
