/**
 * Composant d'écoute audio WebRTC
 * Permet aux proches d'écouter l'environnement sonore en direct
 */
import React from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { COLORS } from '../types';

interface AudioListenerProps {
  sessionId: string;
}

export const AudioListener: React.FC<AudioListenerProps> = ({ sessionId }) => {
  const { isListening, isConnecting, startListening, stopListening, audioRef } = useWebRTC();

  const handleToggle = (): void => {
    if (isListening || isConnecting) {
      stopListening();
    } else {
      startListening(sessionId);
    }
  };

  return (
    <div style={styles.container}>
      {/* Élément audio caché pour la lecture WebRTC */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      <div style={styles.header}>
        <span style={styles.icon}>🎙️</span>
        <div>
          <h3 style={styles.title}>Écoute en direct</h3>
          <p style={styles.subtitle}>
            {isListening
              ? 'Connexion audio active'
              : isConnecting
              ? 'Connexion en cours...'
              : 'Entendre l\'environnement sonore'}
          </p>
        </div>
      </div>

      <button
        onClick={handleToggle}
        style={{
          ...styles.button,
          backgroundColor: isListening ? COLORS.danger : COLORS.primary,
        }}
        disabled={false}
      >
        {isConnecting ? (
          <span style={styles.spinner} />
        ) : (
          <span>
            {isListening ? '⏹️ Arrêter' : '▶️ Écouter en direct'}
          </span>
        )}
      </button>

      {isListening && (
        <div style={styles.listeningIndicator}>
          <div style={styles.waveDot} />
          <div style={{ ...styles.waveDot, animationDelay: '0.15s' }} />
          <div style={{ ...styles.waveDot, animationDelay: '0.3s' }} />
          <span style={styles.listeningText}>Audio en cours...</span>
        </div>
      )}

      <p style={styles.note}>
        ⚠️ La personne n'est pas notifiée de l'écoute. Utilisez uniquement en cas d'urgence.
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1A1A1A',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    margin: '4px 0 0',
  },
  button: {
    width: '100%',
    padding: '14px 24px',
    borderRadius: 12,
    border: 'none',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.2s',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  listeningIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    padding: '8px 12px',
    background: '#FEF3C7',
    borderRadius: 8,
  },
  waveDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#E8622A',
    animation: 'wave 1s ease-in-out infinite',
  },
  listeningText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#92400E',
    fontWeight: 600,
  },
  note: {
    marginTop: 12,
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 1.4,
  },
};
