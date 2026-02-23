/**
 * Service de géolocalisation GPS
 * Gère le tracking en temps réel via expo-location
 * Fonctionne en foreground ET en arrière-plan (iOS background modes)
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { BACKGROUND_TASKS, GPS_UPDATE_INTERVAL_MS } from '../utils/constants';
import { GpsPosition } from '../types';

// Callback appelé à chaque nouvelle position (défini par le hook)
let gpsCallback: ((position: GpsPosition) => void) | null = null;
let currentSessionId: string | null = null;

/**
 * Définition de la tâche GPS en arrière-plan
 * Cette tâche est enregistrée au démarrage de l'app et s'exécute même
 * quand l'app est en background (grâce à UIBackgroundModes: location dans app.json)
 */
TaskManager.defineTask(BACKGROUND_TASKS.GPS_LOCATION, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ Erreur tâche GPS background:', error);
    return;
  }

  if (data && currentSessionId) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[locations.length - 1];

    if (location && gpsCallback) {
      // Récupération du niveau de batterie
      let battery: number | undefined;
      try {
        const batteryLevel = await Battery.getBatteryLevelAsync();
        battery = Math.round(batteryLevel * 100);
      } catch {
        // Ignore les erreurs de batterie
      }

      const position: GpsPosition = {
        sessionId: currentSessionId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? 0,
        speed: location.coords.speed ?? undefined,
        heading: location.coords.heading ?? undefined,
        battery,
        timestamp: location.timestamp,
      };

      gpsCallback(position);
    }
  }
});

/**
 * Demande les permissions de localisation iOS
 * Retourne true si les permissions "always" sont accordées
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  // Permission "when in use" (foreground)
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }

  // Permission "always" (background) - requis pour iOS background mode
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  return backgroundStatus === 'granted';
};

/**
 * Démarre le tracking GPS en arrière-plan
 */
export const startBackgroundLocationTracking = async (
  sessionId: string,
  onPosition: (position: GpsPosition) => void
): Promise<void> => {
  currentSessionId = sessionId;
  gpsCallback = onPosition;

  // Vérification que la tâche n'est pas déjà en cours
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASKS.GPS_LOCATION);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION);
  }

  // Démarrage du tracking GPS en arrière-plan
  await Location.startLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION, {
    accuracy: Location.Accuracy.High,
    timeInterval: GPS_UPDATE_INTERVAL_MS,
    distanceInterval: 5, // Minimum 5 mètres de déplacement pour déclencher update
    showsBackgroundLocationIndicator: true, // Indicateur bleu iOS (requis)
    foregroundService: {
      // Android uniquement, ignoré sur iOS
      notificationTitle: 'Beaver - Alerte active',
      notificationBody: 'Votre position est partagée avec vos proches',
      notificationColor: '#1B4F8A',
    },
    pausesUpdatesAutomatically: false, // Ne pas mettre en pause
    activityType: Location.ActivityType.Other,
  });

  console.log('✅ GPS background tracking démarré');
};

/**
 * Arrête le tracking GPS en arrière-plan
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASKS.GPS_LOCATION);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION);
    }
    currentSessionId = null;
    gpsCallback = null;
    console.log('✅ GPS background tracking arrêté');
  } catch (error) {
    console.error('❌ Erreur arrêt GPS:', error);
  }
};

/**
 * Récupère la position actuelle (une seule fois)
 */
export const getCurrentPosition = async (): Promise<Location.LocationObject | null> => {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
  } catch {
    return null;
  }
};
