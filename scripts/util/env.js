const fs = require('fs');
const path = require('path');

// Minimal .env.local loader for local dev, so contributors don't need to
// export vars by hand. Only fills in vars not already set in the real
// environment (CI sets RECAPTCHA_SITE_KEY etc. via real env vars, which
// take precedence). No dependency on the "dotenv" package for this.
function loadDotEnvLocal(rootDir) {
  const envPath = path.join(rootDir, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

module.exports = { loadDotEnvLocal };
