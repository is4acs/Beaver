/**
 * Constantes de l'application Beaver
 */

// Couleurs brand Beaver
export const COLORS = {
  primary: '#1B4F8A',    // Bleu Beaver
  secondary: '#E8622A',  // Orange Beaver
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  background: '#F8FAFF',
} as const;

// Clés de stockage local (AsyncStorage / SecureStore)
export const STORAGE_KEYS = {
  USER_FIRST_NAME: 'beaver_user_first_name',
  CONTACTS: 'beaver_contacts',
  PIN_CODE: 'beaver_pin_code',
  SESSION_ID: 'beaver_session_id',
  TIMER_DURATION: 'beaver_timer_duration',
  ONBOARDING_DONE: 'beaver_onboarding_done',
} as const;

// Tâches de fond Expo
export const BACKGROUND_TASKS = {
  GPS_LOCATION: 'beaver-gps-location-task',
} as const;

// Intervalle d'envoi GPS (en millisecondes)
export const GPS_UPDATE_INTERVAL_MS = 5000; // 5 secondes

// Durée par défaut de la session
export const DEFAULT_SESSION_DURATION_MINUTES = 60;

// Délai avant envoi automatique des alertes (après déclenchement SOS)
export const ALERT_COUNTDOWN_SECONDS = 10;

// Serveurs STUN pour WebRTC (connexion P2P à travers NAT)
export const WEBRTC_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// Numéros d'urgence français
export const EMERGENCY_NUMBERS = {
  POLICE: '17',
  SAMU: '15',
  POMPIERS: '18',
  EUROPEAN: '112',
  FEMALE_VIOLENCE: '3919',
} as const;
