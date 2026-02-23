/**
 * Types TypeScript de l'application Beaver
 */

// Contact de confiance
export interface Contact {
  id: string;
  name: string;
  phone: string; // Format E.164 : +33612345678
}

// Session active Beaver
export interface BeaverSession {
  sessionId: string;
  userFirstName: string;
  contacts: Contact[];
  status: 'active' | 'expired' | 'deactivated';
  createdAt: number;
  expiresAt: number;
  trackingUrl: string;
}

// Position GPS
export interface GpsPosition {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp: number;
}

// Configuration du timer de sécurité
export type TimerDuration = 5 | 15 | 30;

// État global de l'app
export interface AppState {
  userFirstName: string;
  contacts: Contact[];
  pinCode: string;
  session: BeaverSession | null;
  isAlertActive: boolean;
  timerDuration: TimerDuration;
}

// Paramètres de navigation
export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Contacts: undefined;
  Settings: undefined;
  Timer: undefined;
  Pin: { mode: 'setup' | 'verify'; onSuccess?: () => void };
};
