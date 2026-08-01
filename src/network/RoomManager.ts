import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { PeerMessage, RemotePeer } from '../types';

export class RoomManager {
  private peer: Peer | null = null;
  private roomId: string;
  private myIndex: number = -1;
  private dataConnections: Map<string, DataConnection> = new Map();
  private mediaConnections: Map<string, MediaConnection> = new Map();
  private localStream: MediaStream | null = null;
  private activePeers: Set<string> = new Set();
  private peerUsernames: Map<string, string> = new Map();
  private peerLastSeen: Map<string, number> = new Map();
  private myUsername: string;
  
  private MAX_PEERS = 8;
  private HEARTBEAT_INTERVAL_MS = 3000;
  private STALE_TIMEOUT_MS = 9000;
  
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private isDisconnected: boolean = false;
  
  public onData?: (data: PeerMessage) => void;
  public onPeersChange?: (peers: RemotePeer[]) => void;
  public onError?: (error: Error) => void;
  public onConnected?: () => void;

  constructor(roomId: string, username: string) {
    this.roomId = roomId;
    this.myUsername = username;
    this.handleUnload = this.handleUnload.bind(this);
  }

  public async connect(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.warn("Microphone not available or denied:", err);
    }

    window.addEventListener('beforeunload', this.handleUnload);
    this.tryConnectIndex(1);
  }

  private handleUnload() {
    this.disconnect();
  }

  private tryConnectIndex(index: number) {
    if (this.isDisconnected) return;
    if (index > this.MAX_PEERS) {
      this.onError?.(new Error("Room is full or unavailable"));
      return;
    }

    const peerId = this.getPeerId(index);
    const newPeer = new Peer(peerId, { debug: 1 });
    this.peer = newPeer;

    newPeer.on('open', (id) => {
      if (this.isDisconnected) {
        newPeer.destroy();
        return;
      }
      console.log('Connected to signaling server with ID:', id);
      this.myIndex = index;
      this.onConnected?.();
      
      this.setupListeners();
      this.connectToOtherPeers();
      this.startHeartbeat();
    });

    newPeer.on('error', (err: any) => {
      if (this.isDisconnected) return;
      if (err.type === 'unavailable-id') {
        newPeer.destroy();
        this.tryConnectIndex(index + 1);
      } else {
        console.error("PeerJS Error:", err);
      }
    });
  }

  private setupListeners() {
    if (!this.peer) return;

    this.peer.on('connection', (conn) => {
      this.setupDataConnection(conn);
    });

    this.peer.on('call', (call) => {
      if (this.localStream) {
        call.answer(this.localStream);
      } else {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        call.answer(dest.stream);
      }
      this.setupMediaConnection(call);
    });
  }

  private connectToOtherPeers() {
    for (let i = 1; i <= this.MAX_PEERS; i++) {
      if (i === this.myIndex) continue;
      
      const targetId = this.getPeerId(i);
      this.initiateConnection(targetId);
    }
  }

  private initiateConnection(targetId: string) {
    if (!this.peer) return;

    const conn = this.peer.connect(targetId, { reliable: true });
    this.setupDataConnection(conn);

    if (this.localStream) {
      const call = this.peer.call(targetId, this.localStream);
      this.setupMediaConnection(call);
    }
  }

  private setupDataConnection(conn: DataConnection) {
    // If we already have a data connection to this peer, clean up the old one
    if (this.dataConnections.has(conn.peer)) {
      const oldConn = this.dataConnections.get(conn.peer);
      if (oldConn && oldConn !== conn) {
        try { oldConn.close(); } catch (_) {}
      }
    }

    conn.on('open', () => {
      this.dataConnections.set(conn.peer, conn);
      this.activePeers.add(conn.peer);
      this.peerLastSeen.set(conn.peer, Date.now());
      this.emitPeersChange();
      // Send our username to the new peer
      conn.send({ type: 'ANNOUNCE', username: this.myUsername });
    });

    conn.on('data', (data: any) => {
      const msg = data as PeerMessage;
      this.peerLastSeen.set(conn.peer, Date.now());

      if (msg.type === 'ANNOUNCE') {
        this.peerUsernames.set(conn.peer, msg.username);
        this.activePeers.add(conn.peer);
        this.emitPeersChange();
      } else if (msg.type === 'LEAVE') {
        this.handlePeerLeave(msg.peerId || conn.peer);
      } else if (msg.type === 'HEARTBEAT') {
        // Keeps peerLastSeen updated
      } else {
        this.onData?.(msg);
      }
    });

    conn.on('close', () => this.handlePeerLeave(conn.peer));
    conn.on('error', () => this.handlePeerLeave(conn.peer));
  }

  private setupMediaConnection(call: MediaConnection) {
    // If we already have a media connection to this peer, clean up the old one
    if (this.mediaConnections.has(call.peer)) {
      const oldCall = this.mediaConnections.get(call.peer);
      if (oldCall && oldCall !== call) {
        try { oldCall.close(); } catch (_) {}
      }
    }

    this.mediaConnections.set(call.peer, call);
    
    call.on('stream', (_remoteStream) => {
      this.activePeers.add(call.peer);
      this.emitPeersChange();
    });

    call.on('close', () => this.handlePeerLeave(call.peer));
    call.on('error', () => this.handlePeerLeave(call.peer));
  }

  private handlePeerLeave(peerId: string) {
    let changed = false;
    if (this.dataConnections.has(peerId)) {
      const conn = this.dataConnections.get(peerId);
      try { conn?.close(); } catch (_) {}
      this.dataConnections.delete(peerId);
      changed = true;
    }
    if (this.mediaConnections.has(peerId)) {
      const call = this.mediaConnections.get(peerId);
      try { call?.close(); } catch (_) {}
      this.mediaConnections.delete(peerId);
      changed = true;
    }
    if (this.activePeers.has(peerId)) {
      this.activePeers.delete(peerId);
      changed = true;
    }
    if (this.peerUsernames.has(peerId)) {
      this.peerUsernames.delete(peerId);
      changed = true;
    }
    if (this.peerLastSeen.has(peerId)) {
      this.peerLastSeen.delete(peerId);
      changed = true;
    }

    if (changed) {
      this.emitPeersChange();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    // Send heartbeat periodically to all peers
    this.heartbeatTimer = setInterval(() => {
      if (this.isDisconnected) return;
      this.broadcast({ type: 'HEARTBEAT', peerId: this.getMyPeerId() });
    }, this.HEARTBEAT_INTERVAL_MS);

    // Check for stale peers that haven't sent a heartbeat recently
    this.staleCheckTimer = setInterval(() => {
      if (this.isDisconnected) return;
      const now = Date.now();
      this.peerLastSeen.forEach((lastSeen, peerId) => {
        if (now - lastSeen > this.STALE_TIMEOUT_MS) {
          console.warn(`Peer ${peerId} timed out (no heartbeat for ${now - lastSeen}ms). Removing.`);
          this.handlePeerLeave(peerId);
        }
      });
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  private emitPeersChange() {
    const peersList: RemotePeer[] = Array.from(this.activePeers).map(peerId => ({
      id: peerId,
      username: this.peerUsernames.get(peerId),
      stream: this.mediaConnections.get(peerId)?.remoteStream
    }));
    this.onPeersChange?.(peersList);
  }

  public broadcast(message: PeerMessage) {
    this.dataConnections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(message);
        } catch (e) {
          console.error("Error sending message to peer:", conn.peer, e);
        }
      }
    });
  }

  public toggleMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  public disconnect() {
    if (this.isDisconnected) return;
    this.isDisconnected = true;

    window.removeEventListener('beforeunload', this.handleUnload);
    this.stopHeartbeat();

    const myId = this.getMyPeerId();
    // Broadcast LEAVE message so connected peers know immediately
    this.broadcast({ type: 'LEAVE', peerId: myId });

    this.dataConnections.forEach(conn => {
      try { conn.close(); } catch (_) {}
    });
    this.mediaConnections.forEach(call => {
      try { call.close(); } catch (_) {}
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    try {
      this.peer?.destroy();
    } catch (_) {}

    this.activePeers.clear();
    this.peerUsernames.clear();
    this.peerLastSeen.clear();
    this.dataConnections.clear();
    this.mediaConnections.clear();
    this.emitPeersChange();
  }

  public getMyPeerId(): string {
    return this.peer?.id || '';
  }

  private getPeerId(index: number) {
    return `peercord-${this.roomId}-${index}`;
  }
}
