/**
 * Expo config. Runs in Node at build/start time.
 * Puts Google Civic API key into extra so the client can read it via Constants.expoConfig.extra
 */
const path = require('path');
const fs = require('fs');
const dirEnv = path.resolve(__dirname, '.env');
const cwdEnv = path.resolve(process.cwd(), '.env');
const envPath = fs.existsSync(dirEnv) ? dirEnv : fs.existsSync(cwdEnv) ? cwdEnv : dirEnv;
try {
  require('dotenv').config({ path: envPath });
} catch (_) {}

const civicKey =
  process.env.EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY ||
  process.env.GOOGLE_CIVIC_API_KEY ||
  '';

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    googleCivicApiKey: civicKey,
  },
});
