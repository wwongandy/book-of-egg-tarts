const fs = require('fs');
const path = require('path');
const { SRC_DIR, ASSETS_DIR, DIST_DIR } = require('./config');

function rimraf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(relPath, contents) {
  const fullPath = path.join(DIST_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, contents);
}

function copyStaticAssets() {
  const files = ['styles.css', 'theme.js', 'search.js', 'contact.js'];
  for (const f of files) {
    fs.copyFileSync(path.join(SRC_DIR, f), path.join(DIST_DIR, f));
  }
}

function copyAssets() {
  if (!fs.existsSync(ASSETS_DIR)) return;
  fs.cpSync(ASSETS_DIR, path.join(DIST_DIR, 'assets'), { recursive: true });
}

module.exports = { rimraf, writeFile, copyStaticAssets, copyAssets };
