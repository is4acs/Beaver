/**
 * Écran d'onboarding Beaver
 * Saisie : prénom + contacts de confiance + code PIN
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { Contact } from '../types';
import { ContactCard } from '../components/ContactCard';
import { PinPad } from '../components/PinPad';
import {
  saveUserFirstName,
  saveContacts,
  savePinCode,
  markOnboardingDone,
} from '../services/storageService';
import { COLORS } from '../utils/constants';

type OnboardingStep = 'name' | 'contacts' | 'pin' | 'pin_confirm';

export default function OnboardingScreen(): React.JSX.Element {
  const [step, setStep] = useState<OnboardingStep>('name');
  const [firstName, setFirstName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ---- Étape 1 : Saisie du prénom ----
  const handleNameNext = (): void => {
    if (!firstName.trim() || firstName.trim().length < 2) {
      Alert.alert('Prénom requis', 'Veuillez saisir votre prénom (minimum 2 caractères)');
      return;
    }
    setStep('contacts');
  };

  // ---- Étape 2 : Ajout de contacts ----
  const handleAddContact = (): void => {
    if (!newContactName.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir le prénom du contact');
      return;
    }

    // Validation du numéro E.164
    const phoneClean = newContactPhone.replace(/\s/g, '');
    if (!/^\+\d{7,15}$/.test(phoneClean)) {
      Alert.alert(
        'Numéro invalide',
        'Format requis : +33612345678\n(avec l\'indicatif pays)'
      );
      return;
    }

    if (contacts.length >= 5) {
      Alert.alert('Maximum atteint', 'Vous pouvez ajouter jusqu\'à 5 contacts');
      return;
    }

    const newContact: Contact = {
      id: uuidv4(),
      name: newContactName.trim(),
      phone: phoneClean,
    };

    setContacts((prev) => [...prev, newContact]);
    setNewContactName('');
    setNewContactPhone('');
  };

  const handleDeleteContact = (id: string): void => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleContactsNext = (): void => {
    if (contacts.length === 0) {
      Alert.alert('Contact requis', 'Ajoutez au moins un contact de confiance');
      return;
    }
    setStep('pin');
  };

  // ---- Étape 3 : Configuration PIN ----
  const handleFirstPin = (pin: string): void => {
    setFirstPin(pin);
    setStep('pin_confirm');
  };

  const handleConfirmPin = async (pin: string): Promise<void> => {
    if (pin !== firstPin) {
      Alert.alert('Codes différents', 'Les deux codes PIN ne correspondent pas. Recommencez.');
      setStep('pin');
      setFirstPin('');
      return;
    }

    // Sauvegarde et fin de l'onboarding
    setIsLoading(true);
    try {
      await saveUserFirstName(firstName.trim());
      await saveContacts(contacts);
      await savePinCode(pin);
      await markOnboardingDone();

      // Navigation vers l'écran principal
      router.replace('/home');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder vos données. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Rendu selon l'étape ----
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.primary, '#2563AB']} style={styles.header}>
        <Text style={styles.headerTitle}>🦫 Beaver</Text>
        <Text style={styles.headerSubtitle}>Votre bouclier personnel</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Indicateur d'étapes */}
        <View style={styles.stepsIndicator}>
          {(['name', 'contacts', 'pin'] as const).map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  (step === s || (step === 'pin_confirm' && s === 'pin') ||
                    (step === 'contacts' && s === 'name') ||
                    (step === 'pin' && (s === 'name' || s === 'contacts')) ||
                    (step === 'pin_confirm' && (s === 'name' || s === 'contacts')))
                    ? styles.stepDotActive
                    : {},
                ]}
              >
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              {i < 2 && <View style={styles.stepLine} />}
            </View>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ---- ÉTAPE 1 : Prénom ---- */}
          {step === 'name' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Bonjour ! Comment vous appelez-vous ?</Text>
              <Text style={styles.stepSubtitle}>
                Votre prénom sera inclus dans le message d'alerte envoyé à vos proches
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Votre prénom"
                value={firstName}
                onChangeText={setFirstName}
                autoFocus
                autoCapitalize="words"
                maxLength={30}
                returnKeyType="next"
                onSubmitEditing={handleNameNext}
              />
              <TouchableOpacity style={styles.primaryButton} onPress={handleNameNext}>
                <Text style={styles.primaryButtonText}>Continuer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ---- ÉTAPE 2 : Contacts ---- */}
          {step === 'contacts' && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Vos contacts de confiance</Text>
              <Text style={styles.stepSubtitle}>
                Ces personnes recevront une alerte WhatsApp ou SMS avec votre position GPS
              </Text>

              {/* Liste des contacts */}
              {contacts.map((contact, index) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onDelete={handleDeleteContact}
                  index={index}
                />
              ))}

              {/* Formulaire ajout contact */}
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
                    placeholder="+33612345678 (avec indicatif pays)"
                    value={newContactPhone}
                    onChangeText={setNewContactPhone}
                    keyboardType="phone-pad"
                    maxLength={16}
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
                    <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.addButtonText}>Ajouter ce contact</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 20 }]}
                onPress={handleContactsNext}
              >
                <Text style={styles.primaryButtonText}>
                  Continuer ({contacts.length} contact{contacts.length > 1 ? 's' : ''})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ---- ÉTAPE 3 : Code PIN ---- */}
          {step === 'pin' && (
            <PinPad
              mode="setup"
              title="Créez votre code PIN"
              subtitle="Ce code de 4 chiffres permet de désactiver l'alerte SOS. Mémorisez-le !"
              onComplete={handleFirstPin}
            />
          )}

          {/* ---- ÉTAPE 4 : Confirmation PIN ---- */}
          {step === 'pin_confirm' && (
            <PinPad
              mode="setup"
              title="Confirmez votre code PIN"
              subtitle="Saisissez à nouveau votre code PIN pour confirmer"
              onComplete={handleConfirmPin}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 4,
  },
  stepContent: {
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
    marginTop: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 24,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addContactForm: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
});
