/**
 * Service Socket.IO côté app mobile
 * Gère la connexion temps réel au backend pour :
 * - Envoi des positions GPS
 * - Signaling WebRTC
 */
import { io, Socket } from 'socket.io-client';
import { GpsPosition } from '../types';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Établit la connexion Socket.IO au backend
 */
export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket.IO connecté:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO déconnecté:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Erreur connexion Socket.IO:', error.message);
  });

  return socket;
};

/**
 * Rejoint la room Socket.IO pour une session
 */
export const joinSession = (sessionId: string): void => {
  if (!socket?.connected) {
    connectSocket();
  }
  socket!.emit('join_session', sessionId);
};

/**
 * Envoie une position GPS au backend via Socket.IO
 */
export const sendGpsPosition = (position: GpsPosition): void => {
  if (socket?.connected) {
    socket.emit('gps_position', position);
  }
};

/**
 * Envoie un SDP offer WebRTC
 */
export const sendWebRTCOffer = (sessionId: string, sdp: RTCSessionDescriptionInit): void => {
  socket?.emit('webrtc_offer', { sessionId, sdp, from: 'app' });
};

/**
 * Envoie un ICE candidate WebRTC
 */
export const sendIceCandidate = (sessionId: string, candidate: RTCIceCandidateInit): void => {
  socket?.emit('webrtc_ice_candidate', { sessionId, candidate, from: 'app' });
};

/**
 * Écoute les réponses SDP answer des proches
 */
export const onWebRTCAnswer = (callback: (sdp: RTCSessionDescriptionInit) => void): void => {
  socket?.on('webrtc_answer', (data) => {
    if (data.from === 'web') callback(data.sdp);
  });
};

/**
 * Écoute les ICE candidates des proches
 */
export const onIceCandidate = (callback: (candidate: RTCIceCandidateInit) => void): void => {
  socket?.on('webrtc_ice_candidate', (data) => {
    if (data.from === 'web') callback(data.candidate);
  });
};

/**
 * Déconnecte le socket
 */
export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};

// Types WebRTC (compatibilité React Native)
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}
