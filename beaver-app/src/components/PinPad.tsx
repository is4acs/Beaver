/**
 * Clavier PIN 4 chiffres
 * Utilisé pour configurer et vérifier le code de désactivation
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../utils/constants';

interface PinPadProps {
  mode: 'setup' | 'verify';
  onComplete: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  error?: string;
}

export const PinPad: React.FC<PinPadProps> = ({
  mode,
  onComplete,
  onCancel,
  title = 'Code PIN',
  subtitle,
  error,
}) => {
  const [digits, setDigits] = useState<string[]>([]);

  const handleDigit = async (digit: string): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (digits.length >= 4) return;

    const newDigits = [...digits, digit];
    setDigits(newDigits);

    // Quand les 4 chiffres sont saisis
    if (newDigits.length === 4) {
      setTimeout(() => {
        onComplete(newDigits.join(''));
        setDigits([]);
      }, 200);
    }
  };

  const handleDelete = async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDigits((prev) => prev.slice(0, -1));
  };

  // Touches du pavé numérique
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* Indicateurs de progression (4 points) */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < digits.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>

      {/* Message d'erreur */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Pavé numérique */}
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key, keyIndex) => (
              <TouchableOpacity
                key={keyIndex}
                style={[styles.key, key === '' && styles.keyHidden]}
                onPress={() => {
                  if (key === '⌫') handleDelete();
                  else if (key !== '') handleDigit(key);
                }}
                disabled={key === ''}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, key === '⌫' && styles.deleteText]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Bouton Annuler */}
      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
  dotError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: 16,
  },
  keypad: {
    marginTop: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHidden: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    color: COLORS.black,
  },
  deleteText: {
    fontSize: 22,
  },
  cancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
});
