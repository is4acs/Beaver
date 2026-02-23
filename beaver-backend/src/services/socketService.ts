/**
 * Service Socket.IO
 * Gère les connexions temps réel pour :
 * - Broadcast des positions GPS
 * - Signaling WebRTC (échange SDP offer/answer + ICE candidates)
 *
 * Architecture :
 * - L'app mobile et la page web rejoignent la même "room" (sessionId)
 * - Les messages sont relayés entre les deux parties
 */
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents, GpsPosition } from '../models/types';
import { isSessionValid, saveGpsPosition } from './sessionService';
import logger from '../config/logger';

// Stockage en mémoire des rooms actives
// En production, utiliser Redis pour le multi-instance
const activeRooms = new Map<string, Set<string>>(); // sessionId → Set<socketId>

export const initializeSocket = (httpServer: HttpServer): Server => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Timeout connexion 60 secondes
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    logger.debug(`🔌 Socket connecté`, { socketId: socket.id });

    /**
     * Rejoindre une room de session
     * Appelé par l'app mobile ET la page web des proches
     */
    socket.on('join_session', async (sessionId: string) => {
      try {
        const { valid, reason } = await isSessionValid(sessionId);

        if (!valid) {
          logger.warn(`⛔ Tentative rejoindre session invalide`, { sessionId, reason });
          // On laisse quand même rejoindre pour les sessions expirées (lecture seulement)
        }

        socket.join(sessionId);

        // Tracking des rooms actives
        if (!activeRooms.has(sessionId)) {
          activeRooms.set(sessionId, new Set());
        }
        activeRooms.get(sessionId)!.add(socket.id);

        logger.info(`👤 Socket rejoint session`, {
          socketId: socket.id,
          sessionId,
          participants: activeRooms.get(sessionId)!.size,
        });
      } catch (error) {
        logger.error(`❌ Erreur join_session`, { error, sessionId });
      }
    });

    /**
     * Réception d'une position GPS depuis l'app mobile
     * → Broadcast à tous les proches dans la room
     * → Sauvegarde en Firestore
     */
    socket.on('gps_position', async (position: GpsPosition) => {
      try {
        const { sessionId } = position;

        // Broadcast aux autres participants de la room (les proches)
        socket.to(sessionId).emit('gps_update', position);

        // Sauvegarde asynchrone en Firestore (ne bloque pas le broadcast)
        saveGpsPosition(position).catch((err) =>
          logger.error(`❌ Erreur sauvegarde GPS`, { error: err })
        );
      } catch (error) {
        logger.error(`❌ Erreur gps_position`, { error });
      }
    });

    /**
     * WebRTC Signaling : Offre SDP (app mobile → page web)
     * L'app mobile initie la connexion WebRTC et envoie son SDP offer
     */
    socket.on('webrtc_offer', (data) => {
      logger.debug(`📡 WebRTC offer reçu`, { sessionId: data.sessionId, from: data.from });
      // Relaye l'offre aux proches dans la room
      socket.to(data.sessionId).emit('webrtc_offer', data);
    });

    /**
     * WebRTC Signaling : Réponse SDP (page web → app mobile)
     */
    socket.on('webrtc_answer', (data) => {
      logger.debug(`📡 WebRTC answer reçu`, { sessionId: data.sessionId, from: data.from });
      socket.to(data.sessionId).emit('webrtc_answer', data);
    });

    /**
     * WebRTC Signaling : ICE Candidates (échange de candidats réseau)
     * Nécessaire pour établir la connexion P2P à travers les NAT/firewalls
     */
    socket.on('webrtc_ice_candidate', (data) => {
      logger.debug(`🧊 ICE candidate reçu`, { sessionId: data.sessionId });
      socket.to(data.sessionId).emit('webrtc_ice_candidate', data);
    });

    /**
     * Déconnexion propre
     */
    socket.on('disconnect', (reason) => {
      logger.debug(`🔌 Socket déconnecté`, { socketId: socket.id, reason });

      // Nettoyage des rooms
      activeRooms.forEach((sockets, sessionId) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          activeRooms.delete(sessionId);
          logger.info(`🏠 Room supprimée (vide)`, { sessionId });
        }
      });
    });
  });

  logger.info('✅ Socket.IO initialisé');
  return io;
};

/**
 * Récupère le nombre de participants actifs dans une room
 */
export const getRoomParticipants = (sessionId: string): number => {
  return activeRooms.get(sessionId)?.size ?? 0;
};
