/**
 * Types TypeScript de la page web Beaver
 */

export interface SessionInfo {
  sessionId: string;
  userFirstName: string;
  status: 'active' | 'expired' | 'deactivated';
  valid: boolean;
  reason?: string;
  createdAt: number;
  expiresAt: number;
  lastGpsUpdate?: number;
}

export interface GpsPosition {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  battery?: number;
  timestamp: number;
}

// Couleurs brand Beaver
export const COLORS = {
  primary: '#1B4F8A',
  secondary: '#E8622A',
  danger: '#DC2626',
  success: '#16A34A',
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
} as const;
