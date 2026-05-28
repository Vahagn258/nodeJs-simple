const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Connection details are injected at runtime by the 4lock connection wiring
// (PostgreSQL outputs -> this app's inputs): DB_HOST/DB_PORT/DB_USER/
// DB_PASSWORD/DB_NAME. None are baked into the image.
const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

const pool = new Pool(dbConfig);
// A dead idle client must not take the process down with it.
pool.on('error', (err) => console.error('[db] idle client error:', err.message));

const dbTarget = `${dbConfig.host || '?'}:${dbConfig.port}/${dbConfig.database || '?'}`;

async function fetchTestRows() {
  const result = await pool.query('SELECT * FROM test');
  return result.rows;
}

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
    db: {
      host: dbConfig.host || null,
      port: dbConfig.port,
      database: dbConfig.database || null,
      user: dbConfig.user || null,
    },
    build: buildInfo,
  });
});

app.get('/echo', (req, res) => {
  res.json({ echo: req.query.msg || '' });
});

// Connects to PostgreSQL using the runtime-injected DB_* env vars and returns
// the rows of the `test` table.
app.get('/db', async (req, res) => {
  try {
    const rows = await fetchTestRows();
    res.json({ status: 'ok', target: dbTarget, rowCount: rows.length, rows });
  } catch (err) {
    const detail = err.message || err.code || String(err);
    console.error(`[db] query failed (${dbTarget}):`, detail);
    res.status(500).json({ status: 'error', target: dbTarget, error: detail });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (buildInfo) console.log('[startup] build info:', buildInfo);

  fetchTestRows()
    .then((rows) => console.log(`[db] connected to ${dbTarget} — test rows:`, rows))
    .catch((err) => console.error(`[db] startup connection/query failed (${dbTarget}):`, err.message || err.code || String(err)));
});
