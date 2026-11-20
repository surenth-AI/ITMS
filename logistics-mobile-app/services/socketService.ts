import { io, Socket } from 'socket.io-client';
import { useAlertStore } from '../store/alertStore';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_ORIGIN } from './api';

// Same backend as the REST API (previously a different, hardcoded LAN address).
const SOCKET_URL = API_ORIGIN;

class SocketService {
  private socket: Socket | null = null;

  async connect() {
    if (this.socket) return;

    let token = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem('jwt_token');
    } else {
      token = await SecureStore.getItemAsync('jwt_token');
    }
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('alert', (data) => {
      useAlertStore.getState().addAlert({
        id: data.id || Math.random().toString(),
        type: data.type,
        severity: data.severity,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
