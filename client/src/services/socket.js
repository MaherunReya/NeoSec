import { io } from 'socket.io-client';
import { API_BASE } from './api';

const getSocketUrl = () => {
  if (API_BASE) {
    return API_BASE.replace('/api', '');
  }
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

let socket;

const initializeSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    path: '/api/socket.io',
    auth: {
      token: `Bearer ${token}`,
      clientType: 'web'
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to server as WEB client');
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
};

// Auto-initialize if token exists
if (localStorage.getItem('token')) {
  initializeSocket();
}

export const getSocket = () => {
  if (!socket && localStorage.getItem('token')) {
    return initializeSocket();
  }
  return socket;
};

export default socket || (localStorage.getItem('token') ? initializeSocket() : null);
