# 🦫 Beaver — Application de Sécurité Personnelle iOS

> **Permettre à une femme en danger de déclencher discrètement une alerte GPS + audio vers ses proches via un lien web unique.**

---

## Structure du projet

```
Beaver/
├── beaver-backend/     # API Node.js + Socket.IO + Firebase
├── beaver-app/         # App React Native (Expo) iOS
└── beaver-web/         # Page de tracking React (Vite)
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| App mobile | React Native + Expo SDK 51 |
| Backend | Node.js 20 + Express + Socket.IO 4 |
| Base de données | Firebase Firestore |
| Temps réel | Socket.IO (GPS) + WebRTC (audio) |
| Alertes | Twilio WhatsApp Business + SMS |
| Cartographie | Google Maps API |
| GPS background | expo-location + UIBackgroundModes |
| Langage | TypeScript partout |

---

## 🚀 Installation & Setup

### Prérequis

- Node.js 20+
- Expo CLI : `npm install -g expo-cli eas-cli`
- Compte Firebase (Firestore)
- Compte Twilio (WhatsApp Sandbox + SMS)
- Clé API Google Maps (+ Maps JavaScript API activée)

---

### 1. Backend

```bash
cd beaver-backend
npm install
cp .env.example .env
# Remplir .env avec vos credentials
npm run dev
```

Le backend démarre sur `http://localhost:3001`

**Endpoints disponibles :**
```
POST /api/session/create        → Créer une session
GET  /api/session/:id           → Infos session
GET  /api/session/:id/track     → Historique GPS
POST /api/session/:id/deactivate→ Désactiver (PIN)
POST /api/alert/send            → Envoyer alertes Twilio
```

---

### 2. App Mobile (iOS)

```bash
cd beaver-app
npm install
cp .env.example .env
# Remplir EXPO_PUBLIC_API_URL avec l'URL de votre backend
npx expo start --ios
```

**Build production iOS :**
```bash
eas build --platform ios --profile production
```

---

### 3. Page Web

```bash
cd beaver-web
npm install
cp .env.example .env
# Remplir VITE_SOCKET_URL et VITE_GOOGLE_MAPS_KEY
npm run dev
```

La page web est accessible sur `http://localhost:5173`
La route de tracking est : `/s/:sessionId`

---

## 🔥 Configuration Firebase

1. Créer un projet Firebase Console
2. Activer **Firestore Database** (mode production)
3. Créer un **Service Account** → télécharger JSON credentials
4. Remplir dans `.env` du backend :

```env
FIREBASE_PROJECT_ID=mon-projet-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@mon-projet.iam.gserviceaccount.com
```

**Collections Firestore créées automatiquement :**
- `sessions` — Sessions d'alerte
- `gps_positions` — Positions GPS
- `alerts` — Logs d'envoi Twilio

**Index Firestore requis :**
```
Collection: gps_positions
Fields: sessionId (ASC), timestamp (ASC)
```

---

## 📱 Configuration Twilio

### Étape 1 : WhatsApp Sandbox (développement)

1. Console Twilio → **Messaging → Try it out → WhatsApp**
2. Rejoindre le sandbox : envoyer `join <mot>` au +1 415 523 8886
3. Les contacts de test doivent aussi rejoindre le sandbox

```env
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Étape 2 : Template Meta approuvé (production)

1. Twilio Console → **Content Template Builder**
2. Créer un template catégorie **Utility** avec variables :
   ```
   🦫 ALERTE BEAVER
   {{1}} a besoin d'aide !
   Suivez sa position : {{2}}
   Urgences : 112 | Police : 17
   ```
3. Soumettre pour approbation Meta (48-72h)
4. Copier le `Content SID` → `WHATSAPP_TEMPLATE_SID=HXxxxx`

### Étape 3 : SMS fallback

```env
TWILIO_PHONE_NUMBER=+33xxxxxxxxx  # Numéro Twilio acheté
```

**Logique Lookup :**
- Twilio Lookup v2 détecte si le numéro est joignable WhatsApp
- Mobile → WhatsApp en priorité
- Fixe/non-mobile → SMS

---

## 🗺️ Configuration Google Maps

1. Google Cloud Console → APIs & Services
2. Activer :
   - **Maps JavaScript API** (page web)
   - **Maps SDK for iOS** (app mobile)
3. Créer une clé API avec restriction de domaine/bundle

```env
# Backend
GOOGLE_MAPS_API_KEY=AIzaSy...

# App mobile (.env)
EXPO_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...

# Page web (.env)
VITE_GOOGLE_MAPS_KEY=AIzaSy...
```

---

## 🍎 Configuration iOS

### UIBackgroundModes (app.json)

Déjà configuré dans `beaver-app/app.json` :
```json
"UIBackgroundModes": ["location", "fetch", "audio"]
```

### Permissions requises

| Permission | Raison |
|-----------|--------|
| NSLocationAlwaysAndWhenInUseUsageDescription | GPS background alerte |
| NSMicrophoneUsageDescription | Stream audio WebRTC |

---

## 🎙️ Siri Shortcut & Back Tap

### Configuration Siri Shortcut

1. **Raccourcis** (app iOS) → `+` → "Ouvrir l'app"
2. Choisir Beaver
3. Nommer le raccourci : "Déclenche Beaver"
4. Enregistrer avec commande Siri : "Hey Siri, déclenche Beaver"

### Back Tap (triple frappe dos iPhone)

1. **Réglages** → Accessibilité → Toucher → **Toucher le dos**
2. **Toucher le dos deux fois** (ou trois fois)
3. Choisir → **Raccourcis** → "Déclenche Beaver"

> Cette fonctionnalité permet de déclencher discrètement l'alerte en tapant deux ou trois fois au dos du téléphone, sans avoir à déverrouiller l'écran.

---

## 🔐 Sécurité

- **Code PIN 4 chiffres** stocké en clair dans SecureStore iOS (chiffré par iOS Keychain)
- Côté backend : PIN hashé SHA-256 avant stockage Firestore
- **Rate limiting** : 5 sessions/heure par IP, 10 alertes/heure par IP
- **Helmet.js** pour headers HTTP sécurisés
- Sessions expirées supprimées automatiquement (cron job horaire)
- CORS restreint aux origines autorisées

> ⚠️ En production, remplacer SHA-256 par bcrypt pour le hash PIN

---

## 🌐 Déploiement production

### Backend (Railway / Render / Fly.io)

```bash
cd beaver-backend
npm run build
# Configurer les variables d'environnement dans le dashboard
# Exposer le port 3001
```

### Page Web (Vercel / Netlify)

```bash
cd beaver-web
npm run build
# Déployer le dossier dist/
# Route: /s/* → index.html (SPA)
```

### Variables d'environnement à mettre à jour

```env
BEAVER_WEB_URL=https://votre-domaine.com
ALLOWED_ORIGINS=https://votre-domaine.com
```

---

## 🗺️ Architecture WebRTC (audio P2P)

```
App Mobile (offrant)          Page Web (recevant)
     │                               │
     │──── SDP Offer ────────────────▶│
     │                               │
     │◀─── SDP Answer ───────────────│
     │                               │
     │──── ICE Candidates ───────────▶│
     │◀─── ICE Candidates ───────────│
     │                               │
     │══════ Flux Audio P2P ══════════│
     │         (WebRTC)              │
     │                               │
          [Backend Socket.IO]
          (signaling relay seulement)
```

Le backend ne reçoit pas le flux audio — connexion 100% P2P.

---

## 📊 Architecture temps réel (GPS)

```
App Mobile                    Backend                  Page Web
    │                            │                         │
    │── GPS position (Socket) ──▶│── broadcast ───────────▶│
    │                            │── save Firestore        │
    │                            │                         │
    │                            │◀─ join_session ─────────│
```

---

## 🧪 Tests

```bash
# Test endpoint création session
curl -X POST http://localhost:3001/api/session/create \
  -H "Content-Type: application/json" \
  -d '{
    "userFirstName": "Marie",
    "contacts": [{"name": "Sophie", "phone": "+33612345678"}],
    "pinCode": "1234"
  }'

# Tester l'envoi d'alerte
curl -X POST http://localhost:3001/api/alert/send \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "VOTRE_SESSION_ID"}'
```

---

## 📋 Roadmap (post-MVP)

- [ ] Notif push silencieuse iOS (APNs) pour activer l'alerte sans ouvrir l'app
- [ ] Bouton hardware : triple clic volume pour déclencher
- [ ] Mode "check-in" : l'alerte se déclenche si l'utilisatrice ne répond pas dans X minutes
- [ ] Historique des alertes passées
- [ ] Partage de position en live sans alerte (mode trajet sécurisé)
- [ ] Multi-langues
- [ ] Apple Watch companion app

---

## 📞 Numéros d'urgence

| Numéro | Service |
|--------|---------|
| **112** | Urgences Europe |
| **17** | Police / Gendarmerie |
| **15** | SAMU |
| **18** | Pompiers |
| **3919** | Violences femmes info (24h/24) |

---

*Beaver — Parce que votre sécurité ne peut pas attendre.*
