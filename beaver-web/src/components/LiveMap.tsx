/**
 * Carte Google Maps avec position live et tracé du trajet
 * Affiche la position en temps réel et le chemin parcouru
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { GpsPosition } from '../types';

interface LiveMapProps {
  currentPosition: GpsPosition | null;
  positions: GpsPosition[];  // Historique pour le tracé
  userName: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({ currentPosition, positions, userName }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialisation de Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) {
      setMapError('Clé Google Maps manquante');
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      // Position initiale (Paris si pas encore de GPS)
      const initialPos = currentPosition
        ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
        : { lat: 48.8566, lng: 2.3522 };

      const map = new google.maps.Map(mapRef.current, {
        center: initialPos,
        zoom: 16,
        mapTypeId: 'roadmap',
        // Style carte minimaliste
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      // Marqueur de position (SVG personnalisé Beaver)
      const marker = new google.maps.Marker({
        map,
        title: `Position de ${userName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#E8622A',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        animation: google.maps.Animation.BOUNCE,
      });

      // Tracé du chemin (polyline bleue)
      const polyline = new google.maps.Polyline({
        map,
        strokeColor: '#1B4F8A',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        geodesic: true,
      });

      googleMapRef.current = map;
      markerRef.current = marker;
      polylineRef.current = polyline;
      setIsMapLoaded(true);
    }).catch((err) => {
      console.error('❌ Erreur chargement Google Maps:', err);
      setMapError('Impossible de charger la carte');
    });
  }, []);

  // Mise à jour de la position du marqueur et du tracé
  useEffect(() => {
    if (!isMapLoaded || !currentPosition) return;

    const latLng = new google.maps.LatLng(
      currentPosition.latitude,
      currentPosition.longitude
    );

    // Déplacement du marqueur
    markerRef.current?.setPosition(latLng);
    // Centrage de la carte sur la nouvelle position
    googleMapRef.current?.panTo(latLng);

    // Mise à jour du tracé
    const path = positions.map((p) =>
      new google.maps.LatLng(p.latitude, p.longitude)
    );
    polylineRef.current?.setPath(path);
  }, [currentPosition, positions, isMapLoaded]);

  if (mapError) {
    return (
      <div style={styles.mapError}>
        <p>🗺️ {mapError}</p>
        {currentPosition && (
          <p style={{ marginTop: 8, fontSize: 12, color: '#6B7280' }}>
            Position : {currentPosition.latitude.toFixed(5)}, {currentPosition.longitude.toFixed(5)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={styles.mapContainer}>
      <div ref={mapRef} style={styles.map} />
      {!isMapLoaded && (
        <div style={styles.mapLoading}>
          <div style={styles.spinner} />
          <p>Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  mapContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F3F4F6',
    gap: '12px',
    color: '#6B7280',
    fontSize: '14px',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #E5E7EB',
    borderTopColor: '#1B4F8A',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  mapError: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F3F4F6',
    borderRadius: '16px',
    color: '#6B7280',
    fontSize: '14px',
  },
};
