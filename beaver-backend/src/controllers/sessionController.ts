/**
 * Contrôleur Sessions - Routes REST pour la gestion des sessions Beaver
 */
import { Request, Response } from 'express';
import {
  createSession,
  getSession,
  isSessionValid,
  deactivateSession,
  getSessionTrack,
} from '../services/sessionService';
import { sendAlertsToContacts } from '../services/twilioService';
import { CreateSessionPayload, SendAlertPayload } from '../models/types';
import logger from '../config/logger';

/**
 * POST /api/session/create
 * Crée une nouvelle session d'alerte avec les contacts
 */
export const createSessionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: CreateSessionPayload = req.body;

    // Validation des données
    if (!payload.userFirstName?.trim()) {
      res.status(400).json({ error: 'Le prénom est requis' });
      return;
    }
    if (!payload.contacts?.length) {
      res.status(400).json({ error: 'Au moins un contact est requis' });
      return;
    }
    if (!payload.pinCode || !/^\d{4}$/.test(payload.pinCode)) {
      res.status(400).json({ error: 'Le code PIN doit être 4 chiffres' });
      return;
    }

    // Validation des numéros de téléphone (format E.164)
    for (const contact of payload.contacts) {
      if (!contact.phone || !/^\+\d{7,15}$/.test(contact.phone)) {
        res.status(400).json({
          error: `Numéro invalide pour ${contact.name}. Format requis: +33612345678`,
        });
        return;
      }
    }

    const session = await createSession(payload);

    res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      trackingUrl: `${process.env.BEAVER_WEB_URL}/s/${session.sessionId}`,
    });
  } catch (error) {
    logger.error('❌ Erreur création session', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * GET /api/session/:sessionId
 * Récupère les infos d'une session (pour la page web des proches)
 */
export const getSessionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { valid, session, reason } = await isSessionValid(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }

    // Retourne les infos publiques (sans le PIN hash)
    res.json({
      sessionId: session.sessionId,
      userFirstName: session.userFirstName,
      status: session.status,
      valid,
      reason,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastGpsUpdate: session.lastGpsUpdate,
    });
  } catch (error) {
    logger.error('❌ Erreur récupération session', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * GET /api/session/:sessionId/track
 * Récupère l'historique GPS d'une session
 */
export const getSessionTrackHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const track = await getSessionTrack(sessionId);
    res.json({ sessionId, positions: track });
  } catch (error) {
    logger.error('❌ Erreur récupération tracé', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * POST /api/session/:sessionId/deactivate
 * Désactive une session avec le code PIN
 */
export const deactivateSessionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { pin } = req.body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      res.status(400).json({ error: 'Code PIN invalide' });
      return;
    }

    const result = await deactivateSession(sessionId, pin);

    if (!result.success) {
      res.status(401).json({ error: result.reason ?? 'Désactivation impossible' });
      return;
    }

    res.json({ success: true, message: 'Session désactivée avec succès' });
  } catch (error) {
    logger.error('❌ Erreur désactivation session', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

/**
 * POST /api/alert/send
 * Déclenche l'envoi des alertes à tous les contacts via Twilio
 */
export const sendAlertHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload: SendAlertPayload = req.body;

    if (!payload.sessionId) {
      res.status(400).json({ error: 'sessionId requis' });
      return;
    }

    const { valid, session, reason } = await isSessionValid(payload.sessionId);

    if (!valid || !session) {
      res.status(403).json({ error: reason ?? 'Session invalide' });
      return;
    }

    // Envoi des alertes Twilio en arrière-plan
    const alerts = await sendAlertsToContacts(session);

    const sent = alerts.filter((a) => a.status === 'sent').length;
    const failed = alerts.filter((a) => a.status === 'failed').length;

    res.json({
      success: true,
      sent,
      failed,
      message: `${sent} alerte(s) envoyée(s)${failed > 0 ? `, ${failed} échec(s)` : ''}`,
    });
  } catch (error) {
    logger.error('❌ Erreur envoi alerte', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};
