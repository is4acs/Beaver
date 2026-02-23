/**
 * Écran principal Beaver
 * - Bouton SOS central
 * - Statut de l'alerte
 * - Timer de sécurité
 * - Appels d'urgence
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  AppState,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SOSButton } from '../components/SOSButton';
import { PinPad } from '../components/PinPad';
import { useAlert } from '../hooks/useAlert';
import {
  getUserFirstName,
  getContacts,
  getPinCode,
  getTimerDuration,
} from '../services/storageService';
import { Contact, TimerDuration } from '../types';
import { COLORS, EMERGENCY_NUMBERS } from '../utils/constants';

export default function HomeScreen(): React.JSX.Element {
  const [firstName, setFirstName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pinCode, setPinCode] = useState('');
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(15);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [securityTimerSeconds, setSecurityTimerSeconds] = useState(0);
  const [securityTimerActive, setSecurityTimerActive] = useState(false);

  const { isActive, session, countdown, isLoading, triggerSOS, cancelAlert, cancelCountdown } =
    useAlert();

  // Chargement des données utilisateur
  const loadData = useCallback(async (): Promise<void> => {
    const [name, savedContacts, pin, duration] = await Promise.all([
      getUserFirstName(),
      getContacts(),
      getPinCode(),
      getTimerDuration(),
    ]);
    setFirstName(name ?? '');
    setContacts(savedContacts);
    setPinCode(pin ?? '');
    setTimerDuration(duration);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recharger les données quand l'écran reprend le focus (retour de Settings)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Timer de sécurité countdown
  useEffect(() => {
    if (!securityTimerActive || securityTimerSeconds <= 0) return;

    const interval = setInterval(() => {
      setSecurityTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSecurityTimerActive(false);
          // Déclenchement automatique du SOS quand le timer expire
          handleTriggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [securityTimerActive]);

  /**
   * Déclenche le SOS avec les données utilisateur stockées
   */
  const handleTriggerSOS = useCallback(async (): Promise<void> => {
    if (!firstName || contacts.length === 0 || !pinCode) {
      Alert.alert('Configuration incomplète', 'Vérifiez vos contacts et code PIN dans les réglages');
      return;
    }

    await triggerSOS({ userFirstName: firstName, contacts, pinCode });
  }, [firstName, contacts, pinCode, triggerSOS]);

  /**
   * Pression sur le bouton SOS :
   * - Si alerte active → ouvrir modal PIN pour désactiver
   * - Sinon → déclencher SOS
   */
  const handleSOSPress = (): void => {
    if (isActive) {
      setShowPinModal(true);
    } else {
      handleTriggerSOS();
    }
  };

  /**
   * Vérification du PIN pour désactiver l'alerte
   */
  const handlePinEntered = async (pin: string): Promise<void> => {
    setPinError('');
    const success = await cancelAlert(pin);
    if (success) {
      setShowPinModal(false);
      Alert.alert('Alerte désactivée', 'Vos proches ont été informés que tout va bien.');
    } else {
      setPinError('Code PIN incorrect. Réessayez.');
    }
  };

  /**
   * Démarre le timer de sécurité
   */
  const handleStartSecurityTimer = (duration: TimerDuration): void => {
    setTimerDuration(duration);
    setSecurityTimerSeconds(duration * 60);
    setSecurityTimerActive(true);
    Alert.alert(
      'Timer démarré',
      `L'alerte se déclenchera automatiquement dans ${duration} minutes si vous ne l'annulez pas.`
    );
  };

  /**
   * Appelle un numéro d'urgence
   */
  const handleCallEmergency = (number: string, label: string): void => {
    Alert.alert(
      `Appeler le ${number}`,
      `Vous allez appeler ${label}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appeler',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Erreur', 'Impossible de passer l\'appel');
            });
          },
        },
      ]
    );
  };

  // Formatage du timer
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ---- Header ---- */}
        <LinearGradient colors={[COLORS.primary, '#2563AB']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>
                {isActive ? '🆘 Alerte active' : `Bonjour, ${firstName} 👋`}
              </Text>
              <Text style={styles.headerSub}>
                {isActive
                  ? `Session partagée avec ${contacts.length} proche${contacts.length > 1 ? 's' : ''}`
                  : 'Vous êtes protégée'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/settings')}
              disabled={isActive}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={isActive ? 'rgba(255,255,255,0.4)' : COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* Statut et lien de tracking */}
          {isActive && session && (
            <View style={styles.sessionInfo}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>EN DIRECT</Text>
              </View>
              <Text style={styles.sessionUrl} numberOfLines={1}>
                {session.trackingUrl}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* ---- Contenu principal ---- */}
        <View style={styles.mainContent}>
          {/* Compte à rebours avant envoi des alertes */}
          {countdown > 0 && (
            <View style={styles.countdownBanner}>
              <Text style={styles.countdownText}>
                Envoi des alertes dans {countdown}s
              </Text>
              <TouchableOpacity onPress={cancelCountdown} style={styles.cancelCountdownBtn}>
                <Text style={styles.cancelCountdownText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ---- Bouton SOS central ---- */}
          <View style={styles.sosSection}>
            <SOSButton
              onPress={handleSOSPress}
              isActive={isActive}
              isLoading={isLoading}
              countdown={countdown}
            />
            <Text style={styles.sosHint}>
              {isActive
                ? 'Appuyez pour désactiver avec votre code PIN'
                : 'Appuyez pour déclencher une alerte SOS'}
            </Text>
          </View>

          {/* ---- Timer de sécurité ---- */}
          {!isActive && (
            <View style={styles.timerSection}>
              <Text style={styles.sectionTitle}>Timer de sécurité</Text>
              <Text style={styles.sectionSubtitle}>
                L'alerte se déclenche automatiquement si vous ne répondez pas
              </Text>

              {securityTimerActive ? (
                <View style={styles.timerActive}>
                  <Text style={styles.timerCountdown}>{formatTimer(securityTimerSeconds)}</Text>
                  <TouchableOpacity
                    style={styles.cancelTimerBtn}
                    onPress={() => {
                      setSecurityTimerActive(false);
                      setSecurityTimerSeconds(0);
                    }}
                  >
                    <Text style={styles.cancelTimerText}>Annuler le timer</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.timerButtons}>
                  {([5, 15, 30] as TimerDuration[]).map((duration) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.timerBtn,
                        timerDuration === duration && styles.timerBtnActive,
                      ]}
                      onPress={() => handleStartSecurityTimer(duration)}
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
              )}
            </View>
          )}

          {/* ---- Contacts actifs ---- */}
          <View style={styles.contactsSection}>
            <Text style={styles.sectionTitle}>
              Vos proches ({contacts.length})
            </Text>
            {contacts.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyContacts}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
                <Text style={styles.emptyContactsText}>Ajoutez des contacts de confiance</Text>
              </TouchableOpacity>
            ) : (
              contacts.slice(0, 3).map((contact) => (
                <View key={contact.id} style={styles.contactItem}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {contact.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  {isActive && (
                    <View style={styles.alertedBadge}>
                      <Text style={styles.alertedText}>Alerté</Text>
                    </View>
                  )}
                </View>
              ))
            )}
            {contacts.length > 3 && (
              <Text style={styles.moreContacts}>
                +{contacts.length - 3} autre{contacts.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* ---- Numéros d'urgence ---- */}
          <View style={styles.emergencySection}>
            <Text style={styles.sectionTitle}>Urgences</Text>
            <View style={styles.emergencyButtons}>
              <TouchableOpacity
                style={[styles.emergencyBtn, styles.emergencyBtnPrimary]}
                onPress={() => handleCallEmergency(EMERGENCY_NUMBERS.EUROPEAN, 'les urgences européennes (112)')}
              >
                <Text style={styles.emergencyBtnNumber}>{EMERGENCY_NUMBERS.EUROPEAN}</Text>
                <Text style={[styles.emergencyBtnLabel, { color: 'rgba(255,255,255,0.8)' }]}>Urgences</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emergencyBtn}
                onPress={() => handleCallEmergency(EMERGENCY_NUMBERS.POLICE, 'la Police (17)')}
              >
                <Text style={[styles.emergencyBtnNumber, { color: COLORS.primary }]}>
                  {EMERGENCY_NUMBERS.POLICE}
                </Text>
                <Text style={styles.emergencyBtnLabel}>Police</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emergencyBtn}
                onPress={() => handleCallEmergency(EMERGENCY_NUMBERS.FEMALE_VIOLENCE, 'Violences Femmes Info (3919)')}
              >
                <Text style={[styles.emergencyBtnNumber, { color: COLORS.warning }]}>
                  {EMERGENCY_NUMBERS.FEMALE_VIOLENCE}
                </Text>
                <Text style={styles.emergencyBtnLabel}>Violences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ---- Modal PIN de désactivation ---- */}
      <Modal
        visible={showPinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPinModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowPinModal(false); setPinError(''); }}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </TouchableOpacity>
          </View>
          <PinPad
            mode="verify"
            title="Désactiver l'alerte"
            subtitle="Saisissez votre code PIN pour désactiver l'alerte SOS"
            error={pinError}
            onComplete={handlePinEntered}
            onCancel={() => { setShowPinModal(false); setPinError(''); }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  settingsButton: { padding: 8 },
  sessionInfo: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444', marginRight: 6 },
  liveText: { fontSize: 11, fontWeight: '700', color: COLORS.white, letterSpacing: 2 },
  sessionUrl: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' },
  mainContent: { padding: 24 },
  countdownBanner: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  countdownText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  cancelCountdownBtn: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cancelCountdownText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  sosSection: { alignItems: 'center', paddingVertical: 32 },
  sosHint: { marginTop: 20, fontSize: 13, color: COLORS.gray, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black, marginBottom: 6 },
  sectionSubtitle: { fontSize: 13, color: COLORS.gray, marginBottom: 16 },
  timerSection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  timerButtons: { flexDirection: 'row', gap: 12 },
  timerBtn: { flex: 1, borderRadius: 12, borderWidth: 2, borderColor: COLORS.lightGray, paddingVertical: 12, alignItems: 'center' },
  timerBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF4FF' },
  timerBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.gray },
  timerBtnTextActive: { color: COLORS.primary },
  timerActive: { alignItems: 'center' },
  timerCountdown: { fontSize: 48, fontWeight: '800', color: COLORS.secondary, fontVariant: ['tabular-nums'] },
  cancelTimerBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: COLORS.lightGray, borderRadius: 10 },
  cancelTimerText: { fontSize: 15, color: COLORS.gray, fontWeight: '600' },
  contactsSection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactInitial: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  contactName: { fontSize: 15, fontWeight: '600', color: COLORS.black },
  contactPhone: { fontSize: 12, color: COLORS.gray, marginTop: 1 },
  alertedBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  alertedText: { fontSize: 11, fontWeight: '600', color: COLORS.success },
  emptyContacts: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyContactsText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  moreContacts: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 8 },
  emergencySection: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  emergencyButtons: { flexDirection: 'row', gap: 12 },
  emergencyBtn: { flex: 1, borderRadius: 12, borderWidth: 2, borderColor: COLORS.lightGray, paddingVertical: 14, alignItems: 'center' },
  emergencyBtnPrimary: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  emergencyBtnNumber: { fontSize: 22, fontWeight: '900', color: COLORS.white },
  emergencyBtnLabel: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: { paddingHorizontal: 24, paddingVertical: 16, alignItems: 'flex-start' },
  modalCancel: { fontSize: 17, color: COLORS.primary },
});
