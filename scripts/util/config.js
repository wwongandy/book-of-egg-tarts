const path = require('path');
const { loadDotEnvLocal } = require('./env');

const ROOT = path.join(__dirname, '..', '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const CONTENT_DIR = path.join(ROOT, 'content');
const SRC_DIR = path.join(ROOT, 'src');
const IMAGES_DIR = path.join(ROOT, 'images');
const DIST_DIR = path.join(ROOT, 'dist');
const PER_PAGE = 10;

loadDotEnvLocal(ROOT);

// BASE is the site's root path, e.g. "/" for a user/org page or a custom
// domain, or "/repo-name/" for a GitHub project page. Set via env var in CI.
let BASE = process.env.SITE_BASE || '/';
if (!BASE.startsWith('/')) BASE = '/' + BASE;
if (!BASE.endsWith('/')) BASE = BASE + '/';

// Google's published test key for reCAPTCHA v2 — always renders and always
// passes, so local builds work out of the box. Replace with your own site
// key (from google.com/recaptcha/admin) via the RECAPTCHA_SITE_KEY env var
// before deploying for real; the test key does not block anything.
const RECAPTCHA_SITE_KEY =
  process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function url(relPath) {
  return BASE + relPath.replace(/^\/+/, '');
}

module.exports = {
  ROOT,
  POSTS_DIR,
  CONTENT_DIR,
  SRC_DIR,
  IMAGES_DIR,
  DIST_DIR,
  PER_PAGE,
  BASE,
  RECAPTCHA_SITE_KEY,
  url,
};
