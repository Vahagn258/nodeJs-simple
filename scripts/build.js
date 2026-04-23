const fs = require('fs');
const path = require('path');
const os = require('os');

const distDir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(distDir, { recursive: true });

const info = {
  buildTime: new Date().toISOString(),
  nodeVersion: process.version,
  commitSha: process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown',
  buildHost: os.hostname(),
};

const outPath = path.join(distDir, 'build-info.json');
fs.writeFileSync(outPath, JSON.stringify(info, null, 2));
console.log('[build] wrote', outPath);
console.log('[build]', info);
