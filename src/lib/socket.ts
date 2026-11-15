import { io, Socket } from 'socket.io-client';
import { SOCKET_PATH, SOCKET_URL } from '@/config';
import { getAccessToken } from '@/api/client';

/**
 * Socket.IO untuk Chat Admin realtime (PRD F-07).
 * - transport websocket dengan fallback polling (mitigasi risiko §12)
 * - reconnect otomatis dengan backoff
 * - token dikirim lewat `auth` dan query (kompatibel dua gaya server python-socketio)
 */
let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket) return socket;
  const token = await getAccessToken();
  socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['websocket', 'polling'],
    auth: { token },
    query: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** Nama event sesuai PRD F-07. Ubah di sini bila backend memakai nama lain. */
export const EVENTS = {
  joinRoom: 'join_room',
  sendMessage: 'send_message',
  typing: 'typing',
  receiveMessage: 'receive_message',
  adminStatus: 'admin_status',
  messageRead: 'message_read',
  adminTyping: 'typing',
} as const;
