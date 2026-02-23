/**
 * Service de stockage local
 * Utilise AsyncStorage pour les données non sensibles
 * et SecureStore pour le code PIN
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Contact, TimerDuration } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// ---- Prénom utilisatrice ----
export const saveUserFirstName = async (name: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_FIRST_NAME, name);
};

export const getUserFirstName = async (): Promise<string | null> => {
  return AsyncStorage.getItem(STORAGE_KEYS.USER_FIRST_NAME);
};

// ---- Contacts ----
export const saveContacts = async (contacts: Contact[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
};

export const getContacts = async (): Promise<Contact[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
  return data ? JSON.parse(data) : [];
};

// ---- Code PIN (stockage sécurisé) ----
export const savePinCode = async (pin: string): Promise<void> => {
  await SecureStore.setItemAsync(STORAGE_KEYS.PIN_CODE, pin);
};

export const getPinCode = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(STORAGE_KEYS.PIN_CODE);
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const storedPin = await getPinCode();
  return storedPin === pin;
};

// ---- Durée timer ----
export const saveTimerDuration = async (duration: TimerDuration): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.TIMER_DURATION, String(duration));
};

export const getTimerDuration = async (): Promise<TimerDuration> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.TIMER_DURATION);
  return (data ? parseInt(data, 10) : 15) as TimerDuration;
};

// ---- Session ID ----
export const saveSessionId = async (sessionId: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
};

export const getSessionId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
};

export const clearSessionId = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_ID);
};

// ---- Onboarding ----
export const markOnboardingDone = async (): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
};

export const isOnboardingDone = async (): Promise<boolean> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
  return data === 'true';
};
