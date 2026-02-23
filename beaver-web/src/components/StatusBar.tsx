/**
 * Barre d'état - Infos contextuelles sur l'alerte
 * Vitesse, batterie, précision, durée d'alerte
 */
import React from 'react';
import { GpsPosition, SessionInfo, COLORS } from '../types';

interface StatusBarProps {
  session: SessionInfo;
  currentPosition: GpsPosition | null;
}

// Convertit m/s en km/h
const mpsToKmh = (mps: number): number => Math.round(mps * 3.6);

// Formate la durée écoulée depuis le démarrage de l'alerte
const formatDuration = (startMs: number): string => {
  const seconds = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
};

// Indicateur de batterie avec couleur
const BatteryIcon: React.FC<{ level: number }> = ({ level }) => {
  const color = level > 30 ? COLORS.success : level > 15 ? '#D97706' : COLORS.danger;
  return (
    <span style={{ color }}>
      🔋 {level}%
    </span>
  );
};

export const StatusBar: React.FC<StatusBarProps> = ({ session, currentPosition }) => {
  const [duration, setDuration] = React.useState('');

  // Mise à jour de la durée chaque seconde
  React.useEffect(() => {
    const update = (): void => setDuration(formatDuration(session.createdAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session.createdAt]);

  const stats = [
    {
      label: 'Durée alerte',
      value: duration,
      icon: '⏱️',
    },
    {
      label: 'Vitesse',
      value: currentPosition?.speed != null
        ? `${mpsToKmh(currentPosition.speed)} km/h`
        : '— km/h',
      icon: '🚗',
    },
    {
      label: 'Précision GPS',
      value: currentPosition?.accuracy != null
        ? `±${Math.round(currentPosition.accuracy)}m`
        : '—',
      icon: '📍',
    },
    {
      label: 'Batterie',
      value: currentPosition?.battery != null ? (
        <BatteryIcon level={currentPosition.battery} />
      ) : '—',
      icon: '',
    },
  ];

  return (
    <div style={styles.container}>
      {stats.map((stat, i) => (
        <div key={i} style={styles.stat}>
          <span style={styles.statIcon}>{stat.icon}</span>
          <span style={styles.statValue}>{stat.value}</span>
          <span style={styles.statLabel}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  stat: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
};
