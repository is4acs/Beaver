/**
 * Écran Réglages Beaver
 * - Modifier le prénom
 * - Gérer les contacts de confiance
 * - Changer le code PIN
 * - Régler la durée du timer
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Contact, TimerDuration } from '../types';
import { ContactCard } from '../components/ContactCard';
import { PinPad } from '../components/PinPad';
import {
  getUserFirstName,
  saveUserFirstName,
  getContacts,
  saveContacts,
  savePinCode,
  verifyPin,
  getTimerDuration,
  saveTimerDuration,
} from '../services/storageService';
import { COLORS } from '../utils/constants';

type PinStep = 'verify_current' | 'new_pin' | 'confirm_pin';

export default function SettingsScreen(): React.JSX.Element {
  const [firstName, setFirstName] = useState('');
  const [originalFirstName, setOriginalFirstName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(15);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('verify_current');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    const [name, savedContacts, duration] = await Promise.all([
      getUserFirstName(),
      getContacts(),
      getTimerDuration(),
    ]);
    setFirstName(name ?? '');
    setOriginalFirstName(name ?? '');
    setContacts(savedContacts);
    setTimerDuration(duration);
  };

  // ---- Prénom ----
  const handleSaveFirstName = async (): Promise<void> => {
    if (!firstName.trim() || firstName.trim().length < 2) {
      Alert.alert('Prénom invalide', 'Minimum 2 caractères');
      return;
    }
    await saveUserFirstName(firstName.trim());
    setOriginalFirstName(firstName.trim());
    setHasChanges(true);
    Alert.alert('Enregistré', 'Votre prénom a été mis à jour');
  };

  // ---- Contacts ----
  const handleAddContact = (): void => {
    if (!newContactName.trim()) {
      Alert.alert('Nom requis', 'Saisissez le prénom du contact');
      return;
    }
    const phoneClean = newContactPhone.replace(/\s/g, '');
    if (!/^\+\d{7,15}$/.test(phoneClean)) {
      Alert.alert('Numéro invalide', 'Format requis : +33612345678\n(avec l\'indicatif pays)');
      return;
    }
    if (contacts.length >= 5) {
      Alert.alert('Maximum atteint', '5 contacts maximum');
      return;
    }

    const newContact: Contact = {
      id: Crypto.randomUUID(),
      name: newContactName.trim(),
      phone: phoneClean,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);
    setNewContactName('');
    setNewContactPhone('');
    setHasChanges(true);
  };

  const handleDeleteContact = (id: string): void => {
    Alert.alert(
      'Supprimer le contact ?',
      'Ce contact ne recevra plus vos alertes SOS',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updated = contacts.filter((c) => c.id !== id);
            setContacts(updated);
            saveContacts(updated);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  // ---- Timer ----
  const handleTimerChange = async (duration: TimerDuration): Promise<void> => {
    setTimerDuration(duration);
    await saveTimerDuration(duration);
    setHasChanges(true);
  };

  // ---- PIN ----
  const handleOpenPinChange = (): void => {
    setPinStep('verify_current');
    setPinError('');
    setNewPin('');
    setShowPinModal(true);
  };

  const handlePinStepComplete = async (pin: string): Promise<void> => {
    setPinError('');

    if (pinStep === 'verify_current') {
      const isValid = await verifyPin(pin);
      if (!isValid) {
        setPinError('Code PIN actuel incorrect');
        return;
      }
      setPinStep('new_pin');
    } else if (pinStep === 'new_pin') {
      setNewPin(pin);
      setPinStep('confirm_pin');
    } else if (pinStep === 'confirm_pin') {
      if (pin !== newPin) {
        setPinError('Les codes ne correspondent pas');
        setPinStep('new_pin');
        setNewPin('');
        return;
      }
      await savePinCode(pin);
      setShowPinModal(false);
      setHasChanges(true);
      Alert.alert('Code PIN modifié', 'Votre nouveau code PIN a été enregistré');
    }
  };

  const getPinTitle = (): string => {
    switch (pinStep) {
      case 'verify_current':
        return 'Code PIN actuel';
      case 'new_pin':
        return 'Nouveau code PIN';
      case 'confirm_pin':
        return 'Confirmez le nouveau PIN';
    }
  };

  const getPinSubtitle = (): string => {
    switch (pinStep) {
      case 'verify_current':
        return 'Saisissez votre code PIN actuel pour continuer';
      case 'new_pin':
        return 'Choisissez un nouveau code PIN de 4 chiffres';
      case 'confirm_pin':
        return 'Saisissez à nouveau pour confirmer';
    }
  };

  // ---- Navigation retour ----
  const handleGoBack = (): void => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réglages</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* ---- Section Profil ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Prénom</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                maxLength={30}
              />
              {firstName.trim() !== originalFirstName && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFirstName}>
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ---- Section Contacts ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Contacts de confiance ({contacts.length}/5)
          </Text>
          <View style={styles.card}>
            {contacts.length === 0 ? (
              <Text style={styles.emptyText}>Aucun contact ajouté</Text>
            ) : (
              contacts.map((contact, index) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onDelete={handleDeleteContact}
                  index={index}
                />
              ))
            )}

            {contacts.length < 5 && (
              <View style={styles.addContactForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Prénom du contact"
                  value={newContactName}
                  onChangeText={setNewContactName}
                  autoCapitalize="words"
                  maxLength={30}
                />
                <TextInput
                  style={styles.input}
                  placeholder="+33612345678"
                  value={newContactPhone}
                  onChangeText={setNewContactPhone}
                  keyboardType="phone-pad"
                  maxLength={16}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
                  <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                  <Text style={styles.addButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ---- Section Timer ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timer de sécurité</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              Durée avant le déclenchement automatique de l'alerte
            </Text>
            <View style={styles.timerButtons}>
              {([5, 15, 30] as TimerDuration[]).map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.timerBtn,
                    timerDuration === duration && styles.timerBtnActive,
                  ]}
                  onPress={() => handleTimerChange(duration)}
                >
                  <Text
                    style={[
                      styles.timerBtnText,
                      timerDuration === duration && styles.timerBtnTextActive,
                    ]}
                  >
                    {duration} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ---- Section Sécurité ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={handleOpenPinChange}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
                <Text style={styles.menuItemText}>Modifier le code PIN</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- Section À propos ---- */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ---- Modal changement PIN ---- */}
      <Modal
        visible={showPinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPinModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPinModal(false)}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
          <PinPad
            mode={pinStep === 'verify_current' ? 'verify' : 'setup'}
            title={getPinTitle()}
            subtitle={getPinSubtitle()}
            error={pinError}
            onComplete={handlePinStepComplete}
            onCancel={() => setShowPinModal(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: COLORS.white,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  emptyText: { fontSize: 14, color: COLORS.gray, textAlign: 'center', paddingVertical: 16 },
  addContactForm: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  addButtonText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  description: { fontSize: 13, color: COLORS.gray, marginBottom: 14, lineHeight: 18 },
  timerButtons: { flexDirection: 'row', gap: 10 },
  timerBtn: { flex: 1, borderRadius: 10, borderWidth: 2, borderColor: '#E5E7EB', paddingVertical: 12, alignItems: 'center' },
  timerBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF4FF' },
  timerBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.gray },
  timerBtnTextActive: { color: COLORS.primary },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 16, color: COLORS.black },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutLabel: { fontSize: 15, color: COLORS.gray },
  aboutValue: { fontSize: 15, color: COLORS.black, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { paddingHorizontal: 24, paddingVertical: 16, alignItems: 'flex-start' },
  modalCancel: { fontSize: 17, color: COLORS.primary },
});
