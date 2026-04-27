const { Pool } = require("pg");
const env = require("./env");

if (!env.databaseUrl) {
  // Keep backend start explicit in dev when DB is not configured.
  throw new Error("DATABASE_URL is missing. Add it to backend/.env");
}

const pool = new Pool({
  connectionString: env.databaseUrl
});

module.exports = pool;
