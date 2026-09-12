const fs = require('fs');
const path = require('path');
const { SRC_DIR, IMAGES_DIR, DIST_DIR } = require('./config');

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

function copyImages() {
  if (!fs.existsSync(IMAGES_DIR)) return;
  fs.cpSync(IMAGES_DIR, path.join(DIST_DIR, 'images'), { recursive: true });
}

module.exports = { rimraf, writeFile, copyStaticAssets, copyImages };
