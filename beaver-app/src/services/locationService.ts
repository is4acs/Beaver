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

// Subscription pour le tracking foreground (fallback sans permission arrière-plan)
let watchSubscription: Location.LocationSubscription | null = null;

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
 * Retourne true si au moins la permission foreground est accordée.
 * La permission background ("always") est demandée en best-effort mais
 * n'est pas bloquante : l'app fonctionne avec foreground seul.
 */
export const requestLocationPermissions = async (): Promise<boolean> => {
  // Permission "when in use" (foreground) — obligatoire
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    return false;
  }

  // Permission "always" (background) — optionnelle, best-effort
  // Sur iOS, l'utilisateur peut n'accorder que "While Using" initialement
  try {
    await Location.requestBackgroundPermissionsAsync();
  } catch {
    // Pas bloquant si la demande échoue
  }

  return true; // La permission foreground suffit pour démarrer
};

/**
 * Démarre le tracking GPS.
 * Utilise le background task si la permission "always" est accordée,
 * sinon bascule sur watchPositionAsync (foreground uniquement).
 */
export const startBackgroundLocationTracking = async (
  sessionId: string,
  onPosition: (position: GpsPosition) => void
): Promise<void> => {
  currentSessionId = sessionId;
  gpsCallback = onPosition;

  const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

  if (backgroundStatus === 'granted') {
    // Tracking arrière-plan : arrêt de l'éventuelle tâche précédente
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASKS.GPS_LOCATION);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION, {
      accuracy: Location.Accuracy.High,
      timeInterval: GPS_UPDATE_INTERVAL_MS,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Beaver - Alerte active',
        notificationBody: 'Votre position est partagée avec vos proches',
        notificationColor: '#1B4F8A',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Other,
    });

    console.log('✅ GPS background tracking démarré');
  } else {
    // Fallback : tracking foreground uniquement (watchPositionAsync)
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: GPS_UPDATE_INTERVAL_MS,
        distanceInterval: 5,
      },
      async (location) => {
        if (!currentSessionId || !gpsCallback) return;

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
    );

    console.log('✅ GPS foreground tracking démarré (permission arrière-plan non accordée)');
  }
};

/**
 * Arrête le tracking GPS (background et foreground)
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    // Arrêt du watching foreground si actif
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }

    // Arrêt de la tâche background si enregistrée
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASKS.GPS_LOCATION);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TASKS.GPS_LOCATION);
    }

    currentSessionId = null;
    gpsCallback = null;
    console.log('✅ GPS tracking arrêté');
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
