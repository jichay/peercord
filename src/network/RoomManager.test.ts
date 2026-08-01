// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoomManager } from './RoomManager';

const { MockDataConnection, MockPeer } = vi.hoisted(() => {
  class MockDataConnection {
    public peer: string;
    public open: boolean = true;
    public listeners: Map<string, Function[]> = new Map();

    constructor(peerId: string) {
      this.peer = peerId;
    }

    on(event: string, callback: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const callbacks = this.listeners.get(event) || [];
      callbacks.forEach(cb => cb(...args));
    }

    send = vi.fn();
    close = vi.fn(() => {
      this.open = false;
      this.emit('close');
    });
  }

  class MockPeer {
    public id: string;
    public listeners: Map<string, Function[]> = new Map();

    constructor(id: string) {
      this.id = id;
      Promise.resolve().then(() => {
        this.emit('open', id);
      });
    }

    on(event: string, callback: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);
      return this;
    }

    emit(event: string, ...args: any[]) {
      const callbacks = this.listeners.get(event) || [];
      callbacks.forEach(cb => cb(...args));
    }

    connect(targetId: string) {
      return new MockDataConnection(targetId);
    }

    call() {
      return {
        peer: 'mock-peer',
        on: vi.fn(),
        close: vi.fn(),
      };
    }

    destroy = vi.fn();
  }

  return { MockDataConnection, MockPeer };
});

vi.mock('peerjs', () => {
  return {
    default: MockPeer,
    Peer: MockPeer,
  };
});

describe('RoomManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [{ enabled: true }],
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize and connect', async () => {
    const manager = new RoomManager('room123', 'Alice');
    const onConnected = vi.fn();
    manager.onConnected = onConnected;

    manager.connect();
    await vi.advanceTimersByTimeAsync(50);

    expect(onConnected).toHaveBeenCalled();
  });

  it('should handle peer leave and emit changes', async () => {
    const manager = new RoomManager('room123', 'Alice');
    const onPeersChange = vi.fn();
    manager.onPeersChange = onPeersChange;

    manager.connect();
    await vi.advanceTimersByTimeAsync(50);

    const mockConn = new MockDataConnection('peercord-room123-2');
    (manager as any).setupDataConnection(mockConn);
    mockConn.emit('open');

    mockConn.emit('data', { type: 'ANNOUNCE', username: 'Bob' });
    expect(onPeersChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'peercord-room123-2', username: 'Bob' }),
      ])
    );

    mockConn.emit('data', { type: 'LEAVE', peerId: 'peercord-room123-2' });
    expect(onPeersChange).toHaveBeenLastCalledWith([]);
  });

  it('should disconnect cleanly and broadcast LEAVE', async () => {
    const manager = new RoomManager('room123', 'Alice');
    manager.connect();
    await vi.advanceTimersByTimeAsync(50);

    const mockConn = new MockDataConnection('peercord-room123-2');
    (manager as any).setupDataConnection(mockConn);
    mockConn.emit('open');

    manager.disconnect();

    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LEAVE' })
    );
    expect(mockConn.close).toHaveBeenCalled();
  });

  it('should remove stale peers when heartbeat times out', async () => {
    const manager = new RoomManager('room123', 'Alice');
    const onPeersChange = vi.fn();
    manager.onPeersChange = onPeersChange;

    manager.connect();
    await vi.advanceTimersByTimeAsync(50);

    const mockConn = new MockDataConnection('peercord-room123-2');
    (manager as any).setupDataConnection(mockConn);
    mockConn.emit('open');
    mockConn.emit('data', { type: 'ANNOUNCE', username: 'Bob' });

    expect(onPeersChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'peercord-room123-2' }),
      ])
    );

    await vi.advanceTimersByTimeAsync(15000);

    expect(onPeersChange).toHaveBeenLastCalledWith([]);
  });
});
