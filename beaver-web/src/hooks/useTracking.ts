/**
 * Hook de tracking GPS en temps réel
 * Se connecte au backend via Socket.IO et reçoit les positions GPS
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SessionInfo, GpsPosition } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface UseTrackingReturn {
  session: SessionInfo | null;
  currentPosition: GpsPosition | null;
  positions: GpsPosition[];   // Historique du tracé
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useTracking = (sessionId: string): UseTrackingReturn => {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GpsPosition | null>(null);
  const [positions, setPositions] = useState<GpsPosition[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Chargement des infos de session et historique GPS
  useEffect(() => {
    const loadSession = async (): Promise<void> => {
      try {
        // Récupération des infos de session
        const sessionRes = await fetch(`${API_URL}/api/session/${sessionId}`);
        if (!sessionRes.ok) {
          setError('Session introuvable ou expirée');
          setIsLoading(false);
          return;
        }
        const sessionData: SessionInfo = await sessionRes.json();
        setSession(sessionData);

        if (!sessionData.valid) {
          setIsLoading(false);
          return;
        }

        // Chargement du tracé GPS historique
        const trackRes = await fetch(`${API_URL}/api/session/${sessionId}/track`);
        if (trackRes.ok) {
          const trackData = await trackRes.json();
          setPositions(trackData.positions ?? []);
          if (trackData.positions?.length > 0) {
            setCurrentPosition(trackData.positions[trackData.positions.length - 1]);
          }
        }

      } catch (err) {
        setError('Impossible de charger la session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Connexion Socket.IO pour les mises à jour GPS en temps réel
  useEffect(() => {
    if (!session?.valid) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Rejoindre la room de la session pour recevoir les updates GPS
      socket.emit('join_session', sessionId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Réception des positions GPS en temps réel
    socket.on('gps_update', (position: GpsPosition) => {
      setCurrentPosition(position);
      setPositions((prev) => {
        // Garder les 200 dernières positions pour le tracé
        const updated = [...prev, position];
        return updated.length > 200 ? updated.slice(-200) : updated;
      });
    });

    // Notification changement de statut de session
    socket.on('session_status', (data) => {
      if (data.sessionId === sessionId) {
        setSession((prev) => prev ? { ...prev, status: data.status } : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, session?.valid]);

  return {
    session,
    currentPosition,
    positions,
    isConnected,
    isLoading,
    error,
  };
};
