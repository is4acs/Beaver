/**
 * Hook principal de l'alerte Beaver
 * Orchestre : création session → GPS → alertes Twilio → WebRTC audio
 * Gère la récupération de session après crash/redémarrage
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { BeaverSession, Contact, GpsPosition } from '../types';
import { createSession, sendAlert, deactivateSession, getSession } from '../services/apiService';
import {
  requestLocationPermissions,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  getCurrentPosition,
} from '../services/locationService';
import {
  connectSocket,
  joinSession,
  sendGpsPosition,
  disconnectSocket,
} from '../services/socketService';
import { startAudioStream, stopAudioStream } from '../services/webrtcService';
import {
  saveSessionId,
  clearSessionId,
  getSessionId,
  getUserFirstName,
  getContacts,
} from '../services/storageService';
import { ALERT_COUNTDOWN_SECONDS } from '../utils/constants';

export interface UseAlertReturn {
  isActive: boolean;
  session: BeaverSession | null;
  countdown: number;
  isLoading: boolean;
  triggerSOS: (params: {
    userFirstName: string;
    contacts: Contact[];
    pinCode: string;
  }) => Promise<void>;
  cancelAlert: (pin: string) => Promise<boolean>;
  cancelCountdown: () => void;
}

export const useAlert = (): UseAlertReturn => {
  const [isActive, setIsActive] = useState(false);
  const [session, setSession] = useState<BeaverSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelled = useRef(false);
  const hasRecovered = useRef(false);

  /**
   * Récupération automatique de session au démarrage
   * Si l'app a été fermée pendant une alerte active, on reprend le tracking
   */
  useEffect(() => {
    if (hasRecovered.current) return;
    hasRecovered.current = true;

    const recoverSession = async (): Promise<void> => {
      try {
        const savedSessionId = await getSessionId();
        if (!savedSessionId) return;

        // Vérifier si la session est encore active sur le backend
        const sessionData = await getSession(savedSessionId);
        if (!sessionData || sessionData.status !== 'active') {
          // Session expirée ou désactivée → nettoyage
          await clearSessionId();
          return;
        }

        // Session encore active → reprendre le tracking
        console.log('🔄 Récupération de session active:', savedSessionId);

        const [name, contacts] = await Promise.all([
          getUserFirstName(),
          getContacts(),
        ]);

        const recoveredSession: BeaverSession = {
          sessionId: savedSessionId,
          userFirstName: name ?? '',
          contacts: contacts ?? [],
          status: 'active',
          createdAt: sessionData.createdAt ?? Date.now(),
          expiresAt: sessionData.expiresAt ?? Date.now() + 3600000,
          trackingUrl: `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'}`.replace(':3001', ':5173') + `/s/${savedSessionId}`,
        };

        setSession(recoveredSession);
        setIsActive(true);

        // Reprendre Socket.IO + GPS
        connectSocket();
        joinSession(savedSessionId);

        const hasPermission = await requestLocationPermissions();
        if (hasPermission) {
          await startBackgroundLocationTracking(savedSessionId, (position: GpsPosition) => {
            sendGpsPosition(position);
          });
        }

        // Reprendre audio (non-bloquant)
        try {
          await startAudioStream(savedSessionId);
        } catch (e) {
          console.warn('⚠️ Audio non disponible lors de la récupération:', e);
        }

        console.log('✅ Session récupérée avec succès');
      } catch (error) {
        console.warn('⚠️ Récupération de session échouée:', error);
        await clearSessionId();
      }
    };

    recoverSession();
  }, []);

  /**
   * Démarre le compte à rebours avant envoi automatique des alertes
   */
  const startCountdown = (onComplete: () => void): void => {
    setCountdown(ALERT_COUNTDOWN_SECONDS);
    isCancelled.current = false;

    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current!);
          if (!isCancelled.current) {
            onComplete();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Annule le compte à rebours (l'alerte n'est pas envoyée)
   */
  const cancelCountdown = useCallback(() => {
    isCancelled.current = true;
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    setCountdown(0);
  }, []);

  /**
   * Déclenche le protocole SOS complet :
   * 1. Vérifie les permissions GPS
   * 2. Crée une session sur le backend
   * 3. Connecte Socket.IO
   * 4. Démarre le GPS background
   * 5. Démarre le streaming audio WebRTC
   * 6. Compte à rebours → envoie alertes Twilio
   */
  const triggerSOS = useCallback(async (params: {
    userFirstName: string;
    contacts: Contact[];
    pinCode: string;
  }): Promise<void> => {
    setIsLoading(true);

    try {
      // 1. Vérification permissions GPS
      const hasPermission = await requestLocationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission requise',
          'Beaver a besoin d\'accéder à votre position GPS pour vous protéger. Activez la localisation dans les réglages.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 2. Création de la session sur le backend
      const { sessionId, expiresAt, trackingUrl } = await createSession({
        userFirstName: params.userFirstName,
        contacts: params.contacts,
        pinCode: params.pinCode,
      });

      const newSession: BeaverSession = {
        sessionId,
        userFirstName: params.userFirstName,
        contacts: params.contacts,
        status: 'active',
        createdAt: Date.now(),
        expiresAt,
        trackingUrl,
      };

      setSession(newSession);
      await saveSessionId(sessionId);

      // 3. Connexion Socket.IO et rejoindre la room
      connectSocket();
      joinSession(sessionId);

      // 4. Démarrage GPS background
      await startBackgroundLocationTracking(sessionId, (position: GpsPosition) => {
        sendGpsPosition(position);
      });

      // 5. Démarrage streaming audio WebRTC (discret)
      try {
        await startAudioStream(sessionId);
      } catch (audioError) {
        console.warn('⚠️ Streaming audio non disponible:', audioError);
        // Non bloquant : l'alerte fonctionne sans audio
      }

      setIsActive(true);
      setIsLoading(false);

      // 6. Compte à rebours → envoi des alertes Twilio
      startCountdown(async () => {
        try {
          await sendAlert(sessionId);
          console.log('✅ Alertes SOS envoyées aux contacts');
        } catch (error) {
          console.error('❌ Erreur envoi alertes:', error);
          Alert.alert('Erreur', 'Impossible d\'envoyer les alertes. Vérifiez votre connexion.');
        }
      });

    } catch (error: any) {
      console.error('❌ Erreur déclenchement SOS:', error);
      Alert.alert('Erreur', error.message ?? 'Impossible de démarrer l\'alerte SOS');
      setIsLoading(false);
    }
  }, []);

  /**
   * Désactive l'alerte avec vérification du code PIN
   * Retourne true si désactivation réussie
   */
  const cancelAlert = useCallback(async (pin: string): Promise<boolean> => {
    if (!session) return false;

    try {
      await deactivateSession(session.sessionId, pin);

      // Arrêt de tous les services
      cancelCountdown();
      await stopBackgroundLocationTracking();
      stopAudioStream();
      disconnectSocket();
      await clearSessionId();

      setIsActive(false);
      setSession(null);

      return true;
    } catch (error: any) {
      console.error('❌ Erreur désactivation:', error);
      return false;
    }
  }, [session, cancelCountdown]);

  return {
    isActive,
    session,
    countdown,
    isLoading,
    triggerSOS,
    cancelAlert,
    cancelCountdown,
  };
};
