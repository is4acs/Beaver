/**
 * Application Web Beaver - Router principal
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TrackingPage } from './pages/TrackingPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route principale : page de tracking */}
        <Route path="/s/:sessionId" element={<TrackingPage />} />

        {/* Page d'accueil → redirection (app mobile only) */}
        <Route
          path="/"
          element={
            <div style={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1B4F8A',
              color: '#FFFFFF',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              textAlign: 'center',
              padding: 24,
            }}>
              <h1 style={{ fontSize: 64, margin: 0 }}>🦫</h1>
              <h2 style={{ fontSize: 32, fontWeight: 900, marginTop: 16 }}>Beaver</h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>
                Votre bouclier personnel
              </p>
              <p style={{ marginTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Ouvrez le lien reçu par WhatsApp ou SMS pour suivre une alerte.
              </p>
            </div>
          }
        />

        {/* Route 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
