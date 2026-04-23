const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

let buildInfo = null;
try {
  const raw = fs.readFileSync(path.join(__dirname, 'dist', 'build-info.json'), 'utf8');
  buildInfo = JSON.parse(raw);
} catch (err) {
  console.warn('[startup] dist/build-info.json not found — build step may have been skipped');
}

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: process.env.GREETING || 'Hello from test-node-app',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    node: process.version,
    pid: process.pid,
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      PORT,
      GREETING: process.env.GREETING || null,
    },
    build: buildInfo,
  });
});

app.get('/echo', (req, res) => {
  res.json({ echo: req.query.msg || '' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (buildInfo) console.log('[startup] build info:', buildInfo);
});
