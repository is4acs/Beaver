/**
 * ============================================
 *  BEAVER BACKEND - Point d'entrée principal
 * ============================================
 * App de sécurité personnelle iOS
 * Serveur Express + Socket.IO + Firebase
 */
import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeSocket } from './services/socketService';
import routes from './routes/index';
import { generalRateLimiter } from './middlewares/rateLimiter';
import { startCronJobs } from './utils/cronJobs';
import logger from './config/logger';

// Initialisation de l'app Express
const app = express();
const httpServer = http.createServer(app);

// ---- Middlewares de sécurité ----
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimiter);

// ---- Routes API ----
app.use('/api', routes);

// ---- Gestion des routes non trouvées ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// ---- Gestion des erreurs globales ----
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('❌ Erreur non gérée', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ---- Socket.IO (temps réel GPS + WebRTC signaling) ----
initializeSocket(httpServer);

// ---- Jobs planifiés ----
startCronJobs();

// ---- Démarrage serveur ----
const PORT = parseInt(process.env.PORT ?? '3001', 10);
httpServer.listen(PORT, () => {
  logger.info(`
  ╔════════════════════════════════════╗
  ║   🦫  BEAVER BACKEND DÉMARRÉ      ║
  ║   Port    : ${PORT}                  ║
  ║   Env     : ${process.env.NODE_ENV ?? 'development'}        ║
  ╚════════════════════════════════════╝
  `);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM reçu, arrêt propre...');
  httpServer.close(() => {
    logger.info('✅ Serveur arrêté');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Exception non capturée', { error });
  process.exit(1);
});

export default app;
