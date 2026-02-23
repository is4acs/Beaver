/**
 * Carte de contact - Affiche un contact de confiance
 * avec options d'édition et suppression
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Contact } from '../types';
import { COLORS } from '../utils/constants';

interface ContactCardProps {
  contact: Contact;
  onDelete: (id: string) => void;
  index: number;
}

// Couleurs des avatars rotatifs
const AVATAR_COLORS = [
  '#1B4F8A', '#E8622A', '#16A34A', '#7C3AED', '#DB2777',
];

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onDelete, index }) => {
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      {/* Avatar avec initiales */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Infos contact */}
      <View style={styles.info}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={styles.phone}>{contact.phone}</Text>
      </View>

      {/* Bouton suppression */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(contact.id)}
        accessibilityLabel={`Supprimer ${contact.name}`}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  phone: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
});
