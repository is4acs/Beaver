/**
 * Jobs planifiés Beaver
 * - Nettoyage des sessions expirées (toutes les heures)
 */
import cron from 'node-cron';
import { cleanupExpiredSessions } from '../services/sessionService';
import logger from '../config/logger';

export const startCronJobs = (): void => {
  // Nettoyage des sessions expirées : toutes les heures à H:00
  cron.schedule('0 * * * *', async () => {
    logger.info('🕐 Cron : nettoyage sessions expirées...');
    try {
      const count = await cleanupExpiredSessions();
      logger.info(`✅ Cron terminé`, { sessionsNettoyées: count });
    } catch (error) {
      logger.error('❌ Erreur cron nettoyage', { error });
    }
  });

  logger.info('⏰ Jobs cron démarrés');
};
