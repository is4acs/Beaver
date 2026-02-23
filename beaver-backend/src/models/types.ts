/**
 * Types TypeScript partagés pour le backend Beaver
 */

// ---- Session d'alerte ----
export interface BeaverSession {
  sessionId: string;          // UUID unique de la session
  userFirstName: string;      // Prénom de l'utilisatrice
  contacts: Contact[];        // Contacts de confiance
  status: SessionStatus;      // État de la session
  createdAt: number;          // Timestamp de création (ms)
  expiresAt: number;          // Timestamp d'expiration (ms)
  lastGpsUpdate?: number;     // Dernier update GPS (ms)
  alertSentAt?: number;       // Timestamp envoi alerte (ms)
  pinHash?: string;           // Hash du code PIN (désactivation)
}

export type SessionStatus = 'active' | 'expired' | 'deactivated';

// ---- Contact de confiance ----
export interface Contact {
  id: string;
  name: string;               // Prénom du contact
  phone: string;              // Numéro E.164 (+33612345678)
  notificationChannel?: 'whatsapp' | 'sms'; // Détecté via Twilio Lookup
}

// ---- Position GPS ----
export interface GpsPosition {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;           // Précision en mètres
  speed?: number;             // Vitesse en m/s
  heading?: number;           // Direction en degrés
  battery?: number;           // Niveau batterie 0-100
  timestamp: number;          // Timestamp (ms)
}

// ---- Alerte envoyée ----
export interface Alert {
  sessionId: string;
  contactPhone: string;
  channel: 'whatsapp' | 'sms';
  status: 'sent' | 'failed' | 'delivered';
  twilioSid?: string;
  sentAt: number;
}

// ---- Payload création session ----
export interface CreateSessionPayload {
  userFirstName: string;
  contacts: Array<{ name: string; phone: string }>;
  pinCode: string;            // Code PIN 4 chiffres en clair (sera hashé)
  sessionDurationMinutes?: number; // Durée de vie session (défaut: 60 min)
}

// ---- Payload envoi alerte ----
export interface SendAlertPayload {
  sessionId: string;
  position?: GpsPosition;
}

// ---- Événements Socket.IO ----
export interface ServerToClientEvents {
  gps_update: (position: GpsPosition) => void;
  session_status: (status: { sessionId: string; status: SessionStatus }) => void;
  webrtc_offer: (data: WebRTCSignal) => void;
  webrtc_answer: (data: WebRTCSignal) => void;
  webrtc_ice_candidate: (data: WebRTCIceCandidate) => void;
}

export interface ClientToServerEvents {
  join_session: (sessionId: string) => void;
  gps_position: (position: GpsPosition) => void;
  webrtc_offer: (data: WebRTCSignal) => void;
  webrtc_answer: (data: WebRTCSignal) => void;
  webrtc_ice_candidate: (data: WebRTCIceCandidate) => void;
}

// ---- Signaux WebRTC ----
export interface WebRTCSignal {
  sessionId: string;
  sdp: RTCSessionDescriptionInit;
  from: 'app' | 'web';
}

export interface WebRTCIceCandidate {
  sessionId: string;
  candidate: RTCIceCandidateInit;
  from: 'app' | 'web';
}

// Étend les types RTCSessionDescriptionInit pour Node.js
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}
