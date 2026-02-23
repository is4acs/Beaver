/**
 * Configuration Firebase Admin SDK
 * Initialise la connexion à Firestore pour le stockage des sessions
 */
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import logger from './logger';

// Initialisation de Firebase avec les credentials du service account
const initializeFirebase = (): admin.app.App => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Variables Firebase manquantes dans .env');
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  logger.info('✅ Firebase Admin SDK initialisé');
  return app;
};

// Export de l'instance Firestore
export const firebaseApp = initializeFirebase();
export const db = getFirestore(firebaseApp);

// Collections Firestore
export const COLLECTIONS = {
  SESSIONS: 'sessions',
  GPS_POSITIONS: 'gps_positions',
  ALERTS: 'alerts',
} as const;
