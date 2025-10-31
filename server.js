// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'logins.json');

// Admin credentials (change these before deploying)
const ADMIN_USER = 'lukas';
const ADMIN_PASS = 'lukas-password-change-me';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // optional: serve static frontend from /public

// ensure file exists
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ logins: [] }, null, 2));

// helpers
function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeStore(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}
function requireAdmin(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== ADMIN_USER || user.pass !== ADMIN_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="admin"');
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

/**
 * POST /api/login
 * body: { username, password }
 * if valid credentials (you can change validation strategy), will create an id and store it
 * returns { ok: true, id }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'missing' });

  // For demo: accept specific permanent account or accept the rotating temporary credential.
  // Replace this logic with whatever validation you want.
  const PERMANENT = { username: 'lukas', password: 'lukas' }; // admin permanent
  // Example temporary algorithm (hour-based)
  const nowHour = Math.floor(Date.now() / 3600000);
  const tempIndex = nowHour % 5; // change modulus to temp list length if using list
  const tempList = [
    { username: 'temp1', password: 'abc123' },
    { username: 'temp2', password: 'xyz456' },
    { username: 'temp3', password: 'qwe789' },
    { username: 'temp4', password: 'pass000' },
    { username: 'temp5', password: 'pass111' }
  ];

  let isValid = false;
  if (username === PERMANENT.username && password === PERMANENT.password) isValid = true;
  const curTemp = tempList[tempIndex];
  if (username === curTemp.username && password === curTemp.password) isValid = true;

  if (!isValid) return res.status(401).json({ ok: false, error: 'invalid credentials' });

  // create login record and return id
  const store = readStore();
  const id = uuidv4(); // generated id for device/user
  const record = {
    id,
    username,
    createdAt: new Date().toISOString(),
    valid: true
  };
  store.logins.push(record);
  writeStore(store);

  res.json({ ok: true, id });
});

/**
 * POST /api/refresh
 * body: { id }  (existing id)
 * -> invalidates old id and issues new id (keeps username)
 */
app.post('/api/refresh', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
  const store = readStore();
  const rec = store.logins.find(r => r.id === id);
  if (!rec || !rec.valid) return res.status(404).json({ ok: false, error: 'id not found or invalid' });

  // invalidate old
  rec.valid = false;
  // create new id
  const newId = uuidv4();
  const newRec = {
    id: newId,
    username: rec.username,
    createdAt: new Date().toISOString(),
    valid: true
  };
  store.logins.push(newRec);
  writeStore(store);
  res.json({ ok: true, id: newId });
});

/**
 * POST /api/revoke
 * Requires Basic auth as admin
 * body: { id }
 */
app.post('/api/revoke', requireAdmin, (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
  const store = readStore();
  const rec = store.logins.find(r => r.id === id);
  if (!rec) return res.status(404).json({ ok: false, error: 'not found' });
  rec.valid = false;
  rec.revokedAt = new Date().toISOString();
  writeStore(store);
  res.json({ ok: true });
});

/**
 * POST /api/validate
 * body: { id }
 * returns { ok: true, valid: boolean, record? }
 */
app.post('/api/validate', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
  const store = readStore();
  const rec = store.logins.find(r => r.id === id);
  const valid = !!(rec && rec.valid);
  res.json({ ok: true, valid, record: rec || null });
});

/**
 * GET /api/list
 * Admin-only: list current logins
 */
app.get('/api/list', requireAdmin, (req, res) => {
  const store = readStore();
  res.json({ ok: true, logins: store.logins });
});

// basic health
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
