/**
 * Service de gestion des sessions d'alerte Beaver
 * Crée, lit, met à jour et supprime les sessions dans Firestore
 */
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { db, COLLECTIONS } from '../config/firebase';
import { BeaverSession, CreateSessionPayload, GpsPosition, SessionStatus } from '../models/types';
import logger from '../config/logger';

// Durée de vie par défaut : 60 minutes
const DEFAULT_SESSION_DURATION_MS = 60 * 60 * 1000;

/**
 * Hash simple du code PIN avec salt fixe (en production, utiliser bcrypt)
 */
const hashPin = (pin: string): string => {
  return crypto.createHash('sha256').update(`beaver_${pin}_salt`).digest('hex');
};

/**
 * Crée une nouvelle session d'alerte
 */
export const createSession = async (payload: CreateSessionPayload): Promise<BeaverSession> => {
  const sessionId = uuidv4();
  const now = Date.now();
  const durationMs = (payload.sessionDurationMinutes ?? 60) * 60 * 1000;

  const session: BeaverSession = {
    sessionId,
    userFirstName: payload.userFirstName,
    contacts: payload.contacts.map((c) => ({
      id: uuidv4(),
      name: c.name,
      phone: c.phone,
    })),
    status: 'active',
    createdAt: now,
    expiresAt: now + durationMs,
    pinHash: hashPin(payload.pinCode),
  };

  await db.collection(COLLECTIONS.SESSIONS).doc(sessionId).set(session);
  logger.info(`📍 Session créée`, { sessionId, user: payload.userFirstName });

  return session;
};

/**
 * Récupère une session par son ID
 */
export const getSession = async (sessionId: string): Promise<BeaverSession | null> => {
  const doc = await db.collection(COLLECTIONS.SESSIONS).doc(sessionId).get();
  if (!doc.exists) return null;
  return doc.data() as BeaverSession;
};

/**
 * Vérifie si une session est valide et active
 */
export const isSessionValid = async (sessionId: string): Promise<{ valid: boolean; session?: BeaverSession; reason?: string }> => {
  const session = await getSession(sessionId);

  if (!session) {
    return { valid: false, reason: 'Session introuvable' };
  }
  if (session.status === 'expired') {
    return { valid: false, reason: 'Session expirée', session };
  }
  if (session.status === 'deactivated') {
    return { valid: false, reason: 'Session désactivée', session };
  }
  if (Date.now() > session.expiresAt) {
    await updateSessionStatus(sessionId, 'expired');
    return { valid: false, reason: 'Session expirée', session };
  }

  return { valid: true, session };
};

/**
 * Met à jour le statut d'une session
 */
export const updateSessionStatus = async (sessionId: string, status: SessionStatus): Promise<void> => {
  await db.collection(COLLECTIONS.SESSIONS).doc(sessionId).update({ status });
  logger.info(`🔄 Session mise à jour`, { sessionId, status });
};

/**
 * Sauvegarde une position GPS dans Firestore
 */
export const saveGpsPosition = async (position: GpsPosition): Promise<void> => {
  const docId = `${position.sessionId}_${position.timestamp}`;
  await db.collection(COLLECTIONS.GPS_POSITIONS).doc(docId).set(position);
  // Mise à jour du timestamp dans la session
  await db.collection(COLLECTIONS.SESSIONS).doc(position.sessionId).update({
    lastGpsUpdate: position.timestamp,
  });
};

/**
 * Récupère le tracé GPS d'une session (50 dernières positions)
 */
export const getSessionTrack = async (sessionId: string): Promise<GpsPosition[]> => {
  const snapshot = await db
    .collection(COLLECTIONS.GPS_POSITIONS)
    .where('sessionId', '==', sessionId)
    .orderBy('timestamp', 'asc')
    .limitToLast(200)
    .get();

  return snapshot.docs.map((doc) => doc.data() as GpsPosition);
};

/**
 * Désactive une session avec vérification du PIN
 */
export const deactivateSession = async (sessionId: string, pin: string): Promise<{ success: boolean; reason?: string }> => {
  const session = await getSession(sessionId);
  if (!session) return { success: false, reason: 'Session introuvable' };

  const pinHash = hashPin(pin);
  if (session.pinHash !== pinHash) {
    logger.warn(`❌ Tentative désactivation PIN incorrect`, { sessionId });
    return { success: false, reason: 'Code PIN incorrect' };
  }

  await updateSessionStatus(sessionId, 'deactivated');
  logger.info(`✅ Session désactivée`, { sessionId });
  return { success: true };
};

/**
 * Supprime les sessions expirées (appelé par cron job)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  const now = Date.now();
  const snapshot = await db
    .collection(COLLECTIONS.SESSIONS)
    .where('expiresAt', '<', now)
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: 'expired' });
  });

  await batch.commit();
  logger.info(`🧹 Sessions expirées nettoyées`, { count: snapshot.size });
  return snapshot.size;
};
