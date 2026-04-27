# Carte Fidelite SaaS MVP

Plateforme multi-commercants pour cartes de fidelite digitales (Apple Wallet + Google Wallet ready).

## Structure

- `frontend`: UI mobile-first (auth, creation client, ajout points)
- `frontend-react`: dashboard professionnel React/Vite (recommande)
- `backend`: API REST Express + auth JWT + logique points/recompenses
- `database`: schema PostgreSQL
- `wallet`: templates Apple/Google Wallet

## 1) Setup rapide

1. Creer la base PostgreSQL:
   - `createdb loyalty_saas`
2. Appliquer le schema (+ migrations incrementales si besoin):
   - `psql -d loyalty_saas -f database/schema.sql`
   - ou `cd backend && npm run db:migrate`
3. Configurer les variables:
   - `cp backend/.env.example backend/.env`
   - remplir les variables SMTP pour activer les emails
4. Lancer l'API:
   - `cd backend && npm install && npm run dev`
5. Ouvrir l'UI MVP:
   - ouvrir `frontend/index.html` dans le navigateur
6. Ouvrir l'UI professionnelle:
   - `cd frontend-react && npm install && npm run dev`
7. Lancer backend + frontend ensemble (racine):
   - `npm run dev`

## 2) Endpoints principaux

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/clients`
- `POST /api/clients`
- `POST /api/clients/:clientId/points`
- `GET /api/clients/:clientId/history`
- `DELETE /api/clients/:clientId` (RGPD suppression)
- `GET /api/wallet/apple/:clientId`
- `GET /api/wallet/google/:clientId`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `POST /api/campaigns/:campaignId/send`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/wallet/diagnostics`
- `GET /api/clients/export.csv`
- `POST /api/clients/import/preview`
- `POST /api/clients/import/commit`
- `POST /api/onboarding/events`
- `POST /api/onboarding/link-session`
- `GET /api/analytics/overview`
- `GET /api/analytics/onboarding-funnel`
- `GET /api/analytics/business`

Format de reponse API unifie:
- succes: `{ ok: true, data, meta }`
- erreur: `{ ok: false, error: { code, message, details } }`

## 2b) Ameliorations incluses

- Scan QR camera web (frontend `jsQR`) avec increment automatique visites + points
- Notification email auto a la recompense debloquee
- Campagnes marketing email (clients opt-in uniquement)
- Rate limit API global
- Audit logs des actions sensibles
- Logs HTTP JSON structures
- Pagination et recherche API clients/campagnes

## 2c) QA et release

- Executer tests backend:
  - `cd backend && npm test`
- Executer build frontend pro:
  - `cd frontend-react && npm run build`
- Executer migrations DB:
  - `cd backend && npm run db:migrate`

## 2d) Docker production-like

- Build et lancement stack complete:
  - `docker compose up --build`
- Services:
  - frontend: [http://localhost:5173](http://localhost:5173)
  - backend: [http://localhost:4000/health](http://localhost:4000/health)
  - postgres: `localhost:5432`

## 3) Apple Wallet: configuration exacte

1. Apple Developer:
   - creer un `Pass Type ID` (ex: `pass.com.yourcompany.loyalty`)
   - creer un certificat pour ce Pass Type ID
2. Export certificat:
   - exporter le certificat en `.p12` depuis le Trousseau
3. Convertir les certificats:
   - `openssl pkcs12 -in pass_certificate.p12 -clcerts -nokeys -out signerCert.pem`
   - `openssl pkcs12 -in pass_certificate.p12 -nocerts -out signerKey.pem -nodes`
4. Telecharger certificat WWDR Apple (G4), le renommer `AppleWWDRCAG4.pem`
5. Placer les fichiers dans `wallet/certs/`:
   - `signerCert.pem`
   - `signerKey.pem`
   - `AppleWWDRCAG4.pem`
6. Completer `backend/.env`:
   - `APPLE_WALLET_PASSPHRASE=...`
   - `APPLE_WALLET_WWDR_PATH=../wallet/certs/AppleWWDRCAG4.pem`
   - `APPLE_WALLET_SIGNER_CERT_PATH=../wallet/certs/signerCert.pem`
   - `APPLE_WALLET_SIGNER_KEY_PATH=../wallet/certs/signerKey.pem`
7. Mettre a jour les identifiants:
   - `wallet/templates/apple-pass-model/pass.json`: `passTypeIdentifier`, `teamIdentifier`
   - `backend/src/services/walletService.js`: meme `passTypeIdentifier`, `teamIdentifier`

## 4) Google Wallet (base prete)

- Le endpoint `GET /api/wallet/google/:clientId` retourne un payload compatible "Save to Google Wallet".
- Prochaine etape production:
  - creer un service account Google Wallet API
  - signer le JWT `savetowallet`
  - appeler l'API Google pour creer classes/objects definitifs.
