# Deploy Checklist (Production)

## Database
- [ ] Migrations appliquees (`npm run db:migrate` depuis `backend/`), incluant onboarding + import + `plan_mrr_eur`

## Infrastructure
- [ ] PostgreSQL accessible depuis backend
- [ ] Variables `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL` configurees
- [ ] Certificats Apple Wallet presents dans `wallet/certs/`
- [ ] `GOOGLE_WALLET_ISSUER_ID` configure
- [ ] SMTP configure pour emails transactionnels

## Build & test
- [ ] `cd backend && npm test`
- [ ] `cd backend && npm run db:migrate`
- [ ] `cd backend && npm run start`
- [ ] `cd frontend-react && npm run build`

## Security
- [ ] CORS restreint aux domaines front autorises
- [ ] `JWT_SECRET` fort et unique
- [ ] Rate limit ajuste pour la charge reelle
- [ ] RGPD: process suppression client documente

## Observability
- [ ] Logs JSON collectes (stdout)
- [ ] Audit logs verifies (`audit_logs`)
- [ ] Endpoint `/health` surveille
