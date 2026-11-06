import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  public init(): Socket {
    if (this.socket) return this.socket;

    // Auto-connect to current window.location.origin (protocol + host + port)
    // Ensures whether loaded on localhost, lvh.me, or LAN IP, it connects properly
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io] Connected to server with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket.io] Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket.io] Connection error:', err.message);
    });

    return this.socket;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      return this.init();
    }
    return this.socket;
  }

  public emit(event: string, data?: unknown): void {
    const s = this.getSocket();
    s.emit(event, data);
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    const s = this.getSocket();
    s.on(event, callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    const s = this.getSocket();
    if (callback) {
      s.off(event, callback);
    } else {
      s.off(event);
    }
  }
}

export const socketService = new SocketService();

