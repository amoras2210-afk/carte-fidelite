const path = require("path");
const fs = require("fs/promises");
const db = require("../src/config/db");

const MIGRATION_FILES = [
  "../../database/schema.sql",
  "../../database/migration_002_audit_logs.sql",
  "../../database/migration_003_onboarding_import_business.sql",
  "../../database/migration_004_client_visits.sql",
  "../../database/migration_005_review_notifications.sql",
  "../../database/migration_006_card_design.sql",
  "../../database/migration_007_google_mail_oauth.sql",
  "../../database/migration_008_email_automations.sql",
  "../../database/migration_009_stripe_billing.sql"
];

async function run() {
  try {
    for (const relativeFile of MIGRATION_FILES) {
      const filePath = path.resolve(__dirname, relativeFile);
      const sql = await fs.readFile(filePath, "utf8");
      process.stdout.write(`Applying ${path.basename(filePath)}...\n`);
      await db.query(sql);
    }
    process.stdout.write("Migrations complete.\n");
  } finally {
    await db.end();
  }
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
