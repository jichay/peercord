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
  private myUsername: string;
  
  private MAX_PEERS = 8;
  
  public onData?: (data: PeerMessage) => void;
  public onPeersChange?: (peers: RemotePeer[]) => void;
  public onError?: (error: Error) => void;
  public onConnected?: () => void;

  constructor(roomId: string, username: string) {
    this.roomId = roomId;
    this.myUsername = username;
  }

  public async connect(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.warn("Microphone not available or denied:", err);
    }

    this.tryConnectIndex(1);
  }

  private isDisconnected: boolean = false;

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
      // Answer with our stream
      if (this.localStream) {
        call.answer(this.localStream);
      } else {
        // Create an empty audio track if no mic to satisfy PeerJS expectations
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
    conn.on('open', () => {
      this.dataConnections.set(conn.peer, conn);
      this.activePeers.add(conn.peer);
      this.emitPeersChange();
      // Send our username to the new peer
      conn.send({ type: 'ANNOUNCE', username: this.myUsername });
    });

    conn.on('data', (data: any) => {
      const msg = data as PeerMessage;
      if (msg.type === 'ANNOUNCE') {
        this.peerUsernames.set(conn.peer, msg.username);
        this.emitPeersChange();
      } else {
        this.onData?.(msg);
      }
    });

    conn.on('close', () => this.handlePeerLeave(conn.peer));
    conn.on('error', () => this.handlePeerLeave(conn.peer));
  }

  private setupMediaConnection(call: MediaConnection) {
    this.mediaConnections.set(call.peer, call);
    
    call.on('stream', (_remoteStream) => {
      this.activePeers.add(call.peer);
      this.emitPeersChange();
    });

    call.on('close', () => this.handlePeerLeave(call.peer));
    call.on('error', () => this.handlePeerLeave(call.peer));
  }

  private handlePeerLeave(peerId: string) {
    if (this.dataConnections.has(peerId)) {
      this.dataConnections.get(peerId)?.close();
      this.dataConnections.delete(peerId);
    }
    if (this.mediaConnections.has(peerId)) {
      this.mediaConnections.get(peerId)?.close();
      this.mediaConnections.delete(peerId);
    }
    this.activePeers.delete(peerId);
    this.peerUsernames.delete(peerId);
    this.emitPeersChange();
    
    // Periodically try to reconnect to empty slots to catch late joiners
    // Handled by the fact that the new joiner will connect to us
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
        conn.send(message);
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
    this.isDisconnected = true;
    this.dataConnections.forEach(conn => conn.close());
    this.mediaConnections.forEach(call => call.close());
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peer?.destroy();
  }

  public getMyPeerId(): string {
    return this.peer?.id || '';
  }

  private getPeerId(index: number) {
    return `peercord-${this.roomId}-${index}`;
  }
}
