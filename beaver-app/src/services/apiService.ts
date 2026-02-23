/**
 * Service API - Communication avec le backend Beaver
 */
import { BeaverSession, Contact } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Crée une nouvelle session d'alerte sur le backend
 */
export const createSession = async (params: {
  userFirstName: string;
  contacts: Contact[];
  pinCode: string;
  sessionDurationMinutes?: number;
}): Promise<{ sessionId: string; expiresAt: number; trackingUrl: string }> => {
  const response = await fetch(`${API_URL}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userFirstName: params.userFirstName,
      contacts: params.contacts.map((c) => ({ name: c.name, phone: c.phone })),
      pinCode: params.pinCode,
      sessionDurationMinutes: params.sessionDurationMinutes ?? 60,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? 'Erreur création session');
  }

  return response.json();
};

/**
 * Déclenche l'envoi des alertes WhatsApp/SMS aux contacts
 */
export const sendAlert = async (sessionId: string): Promise<{ sent: number; failed: number }> => {
  const response = await fetch(`${API_URL}/api/alert/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? 'Erreur envoi alerte');
  }

  return response.json();
};

/**
 * Désactive une session avec le code PIN
 */
export const deactivateSession = async (sessionId: string, pin: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/session/${sessionId}/deactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? 'Désactivation impossible');
  }
};

/**
 * Récupère les infos d'une session
 */
export const getSession = async (sessionId: string): Promise<Partial<BeaverSession>> => {
  const response = await fetch(`${API_URL}/api/session/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? 'Session introuvable');
  }

  return response.json();
};
