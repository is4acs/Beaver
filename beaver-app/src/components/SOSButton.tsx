/**
 * Bouton SOS Central - Composant clé de l'app Beaver
 * Grand bouton rouge pulsant, déclenche l'alerte au maintien
 */
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../utils/constants';

interface SOSButtonProps {
  onPress: () => void;
  isActive: boolean;
  isLoading: boolean;
  countdown: number;
}

export const SOSButton: React.FC<SOSButtonProps> = ({
  onPress,
  isActive,
  isLoading,
  countdown,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Animation pulsante quand l'alerte est active
  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.8,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [isActive]);

  const handlePress = async (): Promise<void> => {
    // Vibration haptique forte pour confirmer l'action
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  const buttonColor = isActive ? COLORS.secondary : COLORS.danger;

  return (
    <View style={styles.container}>
      {/* Anneau de glow externe */}
      <Animated.View
        style={[
          styles.glowRing,
          { borderColor: buttonColor, opacity: glowAnim },
        ]}
      />

      {/* Bouton SOS */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={handlePress}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityLabel={isActive ? 'Annuler l\'alerte SOS' : 'Déclencher l\'alerte SOS'}
          accessibilityHint={
            isActive
              ? 'Appuyez pour désactiver l\'alerte SOS avec votre code PIN'
              : 'Appuyez pour déclencher une alerte d\'urgence'
          }
        >
          {/* Texte principal */}
          <Text style={styles.sosText}>SOS</Text>

          {/* Sous-texte contextuel */}
          <Text style={styles.subText}>
            {isLoading
              ? 'Activation...'
              : countdown > 0
              ? `Envoi dans ${countdown}s`
              : isActive
              ? 'ALERTE ACTIVE'
              : 'Appuyer'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
  },
  button: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  sosText: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 4,
  },
  subText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
