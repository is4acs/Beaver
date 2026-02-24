/**
 * Service WebRTC - Streaming audio discret
 *
 * L'app mobile active le micro et envoie le flux audio en P2P
 * aux proches qui ouvrent la page web (bouton "Écouter en direct")
 *
 * Utilise react-native-webrtc pour l'accès au micro iOS
 */
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { WEBRTC_ICE_SERVERS } from '../utils/constants';
import { sendWebRTCOffer, sendIceCandidate, onWebRTCAnswer, onIceCandidate } from './socketService';

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

/**
 * Initialise le micro et commence le streaming WebRTC vers les proches
 */
export const startAudioStream = async (sessionId: string): Promise<void> => {
  try {
    // Création de la connexion WebRTC
    peerConnection = new RTCPeerConnection({
      iceServers: WEBRTC_ICE_SERVERS,
    });

    // Capture du micro (audio seulement, pas de vidéo)
    // Note : sampleRate n'est pas un constraint supporté par react-native-webrtc sur iOS
    localStream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });

    // Ajout de la piste audio à la connexion WebRTC
    localStream.getTracks().forEach((track) => {
      peerConnection!.addTrack(track, localStream!);
    });

    // Gestion des ICE candidates (découverte du chemin réseau)
    peerConnection.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendIceCandidate(sessionId, event.candidate);
      }
    };

    // Création et envoi du SDP offer aux proches
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: false, // L'app envoie seulement, ne reçoit pas
      offerToReceiveVideo: false,
    });
    await peerConnection.setLocalDescription(offer);
    sendWebRTCOffer(sessionId, offer);

    // Écoute de la réponse SDP des proches
    onWebRTCAnswer(async (sdp) => {
      if (peerConnection && peerConnection.signalingState !== 'stable') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('✅ WebRTC connexion établie avec les proches');
      }
    });

    // Écoute des ICE candidates des proches
    onIceCandidate(async (candidate) => {
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    console.log('🎙️ Streaming audio WebRTC démarré');
  } catch (error) {
    console.error('❌ Erreur démarrage WebRTC:', error);
    throw error;
  }
};

/**
 * Arrête le streaming audio WebRTC
 */
export const stopAudioStream = (): void => {
  try {
    // Arrêt des pistes audio
    localStream?.getTracks().forEach((track) => track.stop());
    localStream = null;

    // Fermeture de la connexion WebRTC
    peerConnection?.close();
    peerConnection = null;

    console.log('✅ Streaming audio WebRTC arrêté');
  } catch (error) {
    console.error('❌ Erreur arrêt WebRTC:', error);
  }
};

/**
 * Vérifie si le streaming audio est actif
 */
export const isAudioStreaming = (): boolean => {
  return peerConnection !== null && localStream !== null;
};
