/**
 * Hook WebRTC côté web (proches)
 * Établit la connexion audio P2P avec l'app mobile
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

// Serveurs STUN pour traverser les NAT
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export interface UseWebRTCReturn {
  isListening: boolean;
  isConnecting: boolean;
  startListening: (sessionId: string) => Promise<void>;
  stopListening: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const useWebRTC = (): UseWebRTCReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  /**
   * Démarre l'écoute audio depuis l'app mobile via WebRTC
   */
  const startListening = useCallback(async (sessionId: string): Promise<void> => {
    setIsConnecting(true);

    try {
      // Connexion Socket.IO pour le signaling WebRTC
      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      await new Promise<void>((resolve) => socket.on('connect', resolve));
      socket.emit('join_session', sessionId);

      // Création de la connexion WebRTC (récepteur audio)
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      // Réception de la piste audio de l'app mobile
      pc.ontrack = (event) => {
        if (audioRef.current && event.streams[0]) {
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.play().catch(console.error);
          setIsListening(true);
          setIsConnecting(false);
        }
      };

      // Envoi des ICE candidates au mobile
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            sessionId,
            candidate: event.candidate,
            from: 'web',
          });
        }
      };

      // Réception du SDP offer depuis l'app mobile
      socket.on('webrtc_offer', async (data: any) => {
        if (data.from !== 'app') return;

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Envoi de la réponse SDP à l'app mobile
        socket.emit('webrtc_answer', { sessionId, sdp: answer, from: 'web' });
      });

      // Réception des ICE candidates du mobile
      socket.on('webrtc_ice_candidate', async (data: any) => {
        if (data.from !== 'app') return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('ICE candidate ignoré:', e);
        }
      });

    } catch (error) {
      console.error('❌ Erreur WebRTC:', error);
      setIsConnecting(false);
    }
  }, []);

  /**
   * Arrête l'écoute audio
   */
  const stopListening = useCallback((): void => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    setIsListening(false);
    setIsConnecting(false);
  }, []);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  return { isListening, isConnecting, startListening, stopListening, audioRef };
};
