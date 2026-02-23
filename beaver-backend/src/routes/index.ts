/**
 * Routes principales de l'API Beaver
 */
import { Router } from 'express';
import {
  createSessionHandler,
  getSessionHandler,
  getSessionTrackHandler,
  deactivateSessionHandler,
  sendAlertHandler,
} from '../controllers/sessionController';
import { rateLimiterMiddleware } from '../middlewares/rateLimiter';

const router = Router();

// ---- Health check ----
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Beaver API', timestamp: new Date().toISOString() });
});

// ---- Sessions ----
// Crée une nouvelle session d'alerte
router.post('/session/create', rateLimiterMiddleware('session'), createSessionHandler);

// Récupère les infos d'une session (page web proches)
router.get('/session/:sessionId', getSessionHandler);

// Récupère l'historique GPS d'une session
router.get('/session/:sessionId/track', getSessionTrackHandler);

// Désactive une session avec PIN
router.post('/session/:sessionId/deactivate', deactivateSessionHandler);

// ---- Alertes ----
// Envoie les alertes WhatsApp/SMS aux contacts
router.post('/alert/send', rateLimiterMiddleware('alert'), sendAlertHandler);

export default router;
