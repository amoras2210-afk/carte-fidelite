const env = require("../config/env");

function buildGoogleWalletPayload({ merchant, client }) {
  const issuerId = env.googleWalletIssuerId || merchant.id;
  const classId = `${issuerId}.${env.googleWalletClassSuffix}`;
  const objectId = `${issuerId}.${client.id}`;

  return {
    iss: "SERVICE_ACCOUNT_EMAIL@PROJECT.iam.gserviceaccount.com",
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      loyaltyObjects: [
        {
          id: objectId,
          classId,
          accountId: client.id,
          accountName: client.full_name,
          loyaltyPoints: {
            label: "Points",
            balance: {
              string: String(client.points)
            }
          },
          state: "ACTIVE",
          barcode: {
            type: "QR_CODE",
            value: `${merchant.id}:${client.id}`
          }
        }
      ],
      loyaltyClasses: [
        {
          id: classId,
          issuerName: merchant.business_name,
          programName: `${merchant.business_name} Loyalty`,
          reviewStatus: "UNDER_REVIEW"
        }
      ]
    }
  };
}

module.exports = { buildGoogleWalletPayload };
