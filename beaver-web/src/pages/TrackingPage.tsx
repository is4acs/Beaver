/**
 * Page de tracking Beaver - Route /s/:sessionId
 * Interface complète pour les proches qui suivent l'alerte
 *
 * Layout mobile-first :
 * - Header avec statut et nom
 * - Carte Google Maps (position live + tracé)
 * - Stats (vitesse, batterie, durée)
 * - Bouton écoute audio WebRTC
 * - Boutons d'urgence 112/17
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { LiveMap } from '../components/LiveMap';
import { AudioListener } from '../components/AudioListener';
import { StatusBar } from '../components/StatusBar';
import { useTracking } from '../hooks/useTracking';
import { COLORS } from '../types';

export const TrackingPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return <ErrorPage message="Lien d'alerte invalide" />;
  }

  return <TrackingContent sessionId={sessionId} />;
};

const TrackingContent: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { session, currentPosition, positions, isConnected, isLoading, error } =
    useTracking(sessionId);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !session) {
    return <ErrorPage message={error ?? 'Session introuvable'} />;
  }

  if (!session.valid) {
    return <ExpiredPage session={session} />;
  }

  const formatTime = (ms: number): string =>
    new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={styles.container}>
      {/* ---- Header ---- */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logo}>🦫 Beaver</div>
          <div style={styles.connectionStatus}>
            <div style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? '#16A34A' : '#DC2626',
            }} />
            <span style={styles.statusText}>
              {isConnected ? 'En direct' : 'Reconnexion...'}
            </span>
          </div>
        </div>

        <div style={styles.alertInfo}>
          <div style={styles.alertIcon}>🆘</div>
          <div>
            <h1 style={styles.alertTitle}>
              {session.userFirstName} a besoin d'aide !
            </h1>
            <p style={styles.alertTime}>
              Alerte déclenchée à {formatTime(session.createdAt)}
            </p>
          </div>
        </div>

        {/* Dernière mise à jour GPS */}
        {session.lastGpsUpdate && (
          <div style={styles.lastUpdate}>
            📍 Position mise à jour à {formatTime(session.lastGpsUpdate)}
          </div>
        )}
      </div>

      {/* ---- Carte Google Maps ---- */}
      <div style={styles.mapSection}>
        <LiveMap
          currentPosition={currentPosition}
          positions={positions}
          userName={session.userFirstName}
        />
      </div>

      {/* ---- Stats ---- */}
      <div style={styles.section}>
        <StatusBar session={session} currentPosition={currentPosition} />
      </div>

      {/* ---- Écoute audio WebRTC ---- */}
      <div style={styles.section}>
        <AudioListener sessionId={sessionId} />
      </div>

      {/* ---- Boutons d'urgence ---- */}
      <div style={styles.emergencySection}>
        <p style={styles.emergencyTitle}>🚨 Appels d'urgence</p>
        <div style={styles.emergencyButtons}>
          <a href="tel:112" style={{ ...styles.emergencyBtn, backgroundColor: COLORS.danger }}>
            <span style={styles.emergencyNumber}>112</span>
            <span style={styles.emergencyLabel}>Urgences EU</span>
          </a>
          <a href="tel:17" style={{ ...styles.emergencyBtn, backgroundColor: COLORS.primary }}>
            <span style={styles.emergencyNumber}>17</span>
            <span style={styles.emergencyLabel}>Police</span>
          </a>
          <a href="tel:3919" style={{ ...styles.emergencyBtn, backgroundColor: '#7C3AED' }}>
            <span style={styles.emergencyNumber}>3919</span>
            <span style={styles.emergencyLabel}>Violences</span>
          </a>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <div style={styles.footer}>
        <p style={styles.footerText}>
          Cette alerte a été créée via l'application Beaver.
          La session expire à {formatTime(session.expiresAt)}.
        </p>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(2); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// ---- Pages d'état ----

const LoadingPage: React.FC = () => (
  <div style={styles.fullPage}>
    <div style={styles.loadingSpinner} />
    <p style={styles.loadingText}>Chargement de l'alerte...</p>
  </div>
);

const ErrorPage: React.FC<{ message: string }> = ({ message }) => (
  <div style={styles.fullPage}>
    <div style={styles.logo}>🦫</div>
    <h2 style={{ color: COLORS.black, marginBottom: 8 }}>Session introuvable</h2>
    <p style={{ color: COLORS.gray, textAlign: 'center', maxWidth: 280 }}>{message}</p>
    <div style={{ marginTop: 32 }}>
      <a href="tel:112" style={{ ...styles.emergencyBtn, backgroundColor: COLORS.danger }}>
        <span style={styles.emergencyNumber}>112</span>
        <span style={styles.emergencyLabel}>Appeler les urgences</span>
      </a>
    </div>
  </div>
);

const ExpiredPage: React.FC<{ session: any }> = ({ session }) => (
  <div style={styles.fullPage}>
    <div style={styles.logo}>🦫</div>
    <h2 style={{ color: COLORS.black, marginBottom: 8 }}>Session terminée</h2>
    <p style={{ color: COLORS.gray, textAlign: 'center', maxWidth: 280 }}>
      {session.status === 'deactivated'
        ? `${session.userFirstName} a désactivé l'alerte. Elle est en sécurité.`
        : "Cette session d'alerte a expiré."}
    </p>
    {session.status === 'deactivated' && (
      <div style={{ marginTop: 16, padding: '12px 20px', backgroundColor: '#DCFCE7', borderRadius: 12 }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <p style={{ color: COLORS.success, fontWeight: 600, marginTop: 4 }}>Tout va bien</p>
      </div>
    )}
  </div>
);

// ---- Styles ----
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#F8FAFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    background: `linear-gradient(135deg, ${COLORS.primary}, #2563AB)`,
    padding: '16px 20px 20px',
    color: '#FFFFFF',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: '4px 10px',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  alertInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  alertIcon: {
    fontSize: 36,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  alertTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    margin: '4px 0 0',
  },
  lastUpdate: {
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '6px 10px',
    display: 'inline-block',
  },
  mapSection: {
    height: 340,
    margin: '0 16px 16px',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  section: {
    padding: '0 16px 16px',
  },
  emergencySection: {
    padding: '0 16px 16px',
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.black,
    marginBottom: 10,
  },
  emergencyButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  emergencyBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 8px',
    borderRadius: 12,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    gap: 4,
  },
  emergencyNumber: {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFFFFF',
  },
  emergencyLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    padding: '16px 20px 32px',
    borderTop: '1px solid #E5E7EB',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  fullPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: '#F8FAFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    border: '4px solid #E5E7EB',
    borderTopColor: COLORS.primary,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 8,
  },
};
