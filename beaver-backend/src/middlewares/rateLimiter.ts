/**
 * Middleware Rate Limiting
 * Protège les endpoints sensibles contre les abus
 */
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Limites selon le type d'endpoint
const limits = {
  // Création session : max 5 par heure par IP
  session: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Trop de sessions créées. Réessayez dans 1 heure.' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  // Envoi alertes : max 10 par heure par IP
  alert: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Trop d\'alertes envoyées. Réessayez dans 1 heure.' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  // API générale : max 100 requêtes par 15 min
  general: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

export const rateLimiterMiddleware = (type: keyof typeof limits) => limits[type];
export const generalRateLimiter = limits.general;
