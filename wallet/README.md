# Wallet Assets

## Apple pass model

Le dossier `templates/apple-pass-model` doit contenir au minimum:

- `pass.json` (deja present)
- `icon.png` (29x29)
- `icon@2x.png` (58x58)
- `logo.png` (160x50 recommande)

Sans ces images, la generation `.pkpass` peut echouer selon le validateur Apple.

## Certificats

Placez ici (dans `wallet/certs/`):

- `AppleWWDRCAG4.pem`
- `signerCert.pem`
- `signerKey.pem`
