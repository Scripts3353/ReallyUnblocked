// server.js
// Auto-create device-bound credentials prototype
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'login.json');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    admins: [{ username: "lukas", password: "lukas" }], // change for prod
    oneTime: [],   // { id, username, password, assignedDeviceId|null, used:boolean, createdAt }
    devices: []    // { id, username, createdAt, revokedUntil|null }
  }, null, 2));
}

function readStore(){ return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeStore(s){ fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2)); }

function randomString(len = 8) {
  return uuidv4().replace(/-/g,'').slice(0, len);
}

/**
 * POST /api/auto_create
 * - Creates a device entry and a oneTime credential bound to that device.
 * - Returns { ok:true, deviceId, username, password }
 *
 * This endpoint is intended to be called automatically by the login page
 * when a new visitor arrives (if they don't already have a deviceId).
 */
app.post('/api/auto_create', (req, res) => {
  const store = readStore();

  // create device id
  const deviceId = 'dev-' + randomString(10);

  // create a generated username/password for record (visible on UI if desired)
  const username = 'u_' + randomString(6);
  const password = randomString(10);

  // create oneTime credential record and bind to device immediately
  const oneTimeRec = {
    id: uuidv4(),
    username,
    password,
    assignedDeviceId: deviceId, // bound to device — can't be used elsewhere
    used: true,                 // mark used because it's immediately consumed for this device
    createdAt: new Date().toISOString()
  };

  // create device entry
  const deviceRec = {
    id: deviceId,
    username, // store generated username as friendly name
    createdAt: new Date().toISOString(),
    revokedUntil: null
  };

  store.oneTime.push(oneTimeRec);
  store.devices.push(deviceRec);
  writeStore(store);

  res.json({ ok:true, deviceId, username, password });
});


/**
 * POST /api/validate
 * body: { deviceId }
 * returns { ok:true, valid:boolean, reason?, device? }
 */
app.post('/api/validate', (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ ok:false, error:'missing deviceId' });

  const store = readStore();
  const device = store.devices.find(d => d.id === deviceId);
  if (!device) return res.json({ ok:true, valid:false, reason:'not_found' });
  if (device.revokedUntil === -1) return res.json({ ok:true, valid:false, reason:'revoked_permanently' });
  if (device.revokedUntil && device.revokedUntil > Date.now()) return res.json({ ok:true, valid:false, reason:'revoked_temporarily' });

  res.json({ ok:true, valid:true, device });
});

/**
 * POST /api/login
 * legacy endpoint if someone tries to login with username/password
 * but only allow if username/password assignedDeviceId equals provided deviceId (if provided).
 * Body: { username, password, deviceId? }
 */
app.post('/api/login', (req, res) => {
  const { username, password, deviceId } = req.body || {};
  const store = readStore();

  // admin login
  const admin = store.admins.find(a => a.username === username && a.password === password);
  if (admin) {
    // create admin device
    const deviceIdNew = 'dev-' + randomString(10);
    store.devices.push({ id: deviceIdNew, username: admin.username, createdAt: new Date().toISOString(), revokedUntil: null });
    writeStore(store);
    return res.json({ ok:true, deviceId: deviceIdNew, isAdmin:true });
  }

  // oneTime
  const ot = store.oneTime.find(o => o.username === username && o.password === password);
  if (!ot) return res.status(401).json({ ok:false, error:'invalid credentials' });

  // If credential has assignedDeviceId, enforce match
  if (ot.assignedDeviceId) {
    if (!deviceId || deviceId !== ot.assignedDeviceId) {
      return res.status(403).json({ ok:false, error:'credential bound to another device' });
    }
    // credential already used/assigned — but that's okay because device is same: return deviceId
    return res.json({ ok:true, deviceId: ot.assignedDeviceId, isAdmin:false });
  }

  // If not assignedDeviceId and not used, assign to this deviceId if provided
  if (!ot.assignedDeviceId) {
    if (!deviceId) return res.status(400).json({ ok:false, error:'deviceId required to bind credential' });
    ot.assignedDeviceId = deviceId;
    ot.used = true;
    // create device record if missing
    if (!store.devices.find(d => d.id === deviceId)) {
      store.devices.push({ id: deviceId, username, createdAt: new Date().toISOString(), revokedUntil: null });
    }
    writeStore(store);
    return res.json({ ok:true, deviceId, isAdmin:false });
  }

  // fallback
  return res.status(401).json({ ok:false, error:'invalid' });
});

/**
 * Admin endpoints (simple auth via admin username/password in body)
 * - /api/list (POST) -> returns store
 * - /api/revoke (POST { adminUser, adminPass, deviceId, minutes }) -> revoke
 * - /api/grant (POST { adminUser, adminPass, deviceId }) -> clear revoke
 * - /api/refresh (POST { adminUser, adminPass, deviceId }) -> refresh deviceId (create new)
 */
function checkAdminCredentials(body) {
  const store = readStore();
  if (!body || !body.adminUser || !body.adminPass) return false;
  return !!store.admins.find(a => a.username === body.adminUser && a.password === body.adminPass);
}

app.post('/api/list', (req, res) => {
  if (!checkAdminCredentials(req.body)) return res.status(403).json({ ok:false, error:'unauthorized' });
  const store = readStore();
  res.json({ ok:true, store });
});

app.post('/api/revoke', (req, res) => {
  if (!checkAdminCredentials(req.body)) return res.status(403).json({ ok:false, error:'unauthorized' });
  const { deviceId, minutes } = req.body;
  const store = readStore();
  const d = store.devices.find(x => x.id === deviceId);
  if (!d) return res.status(404).json({ ok:false, error:'device not found' });
  if (!minutes || parseInt(minutes) <= 0) d.revokedUntil = -1;
  else d.revokedUntil = Date.now() + parseInt(minutes) * 60 * 1000;
  writeStore(store);
  res.json({ ok:true, device: d });
});

app.post('/api/grant', (req, res) => {
  if (!checkAdminCredentials(req.body)) return res.status(403).json({ ok:false, error:'unauthorized' });
  const { deviceId } = req.body;
  const store = readStore();
  const d = store.devices.find(x => x.id === deviceId);
  if (!d) return res.status(404).json({ ok:false, error:'device not found' });
  d.revokedUntil = null;
  writeStore(store);
  res.json({ ok:true, device: d });
});

app.post('/api/refresh', (req, res) => {
  if (!checkAdminCredentials(req.body)) return res.status(403).json({ ok:false, error:'unauthorized' });
  const { deviceId } = req.body;
  const store = readStore();
  const idx = store.devices.findIndex(x => x.id === deviceId);
  if (idx === -1) return res.status(404).json({ ok:false, error:'device not found' });

  // mark old device revoked, create a new device id
  store.devices[idx].revokedUntil = -1;
  const newId = 'dev-' + randomString(10);
  const newDevice = { id: newId, username: store.devices[idx].username, createdAt: new Date().toISOString(), revokedUntil: null };
  store.devices.push(newDevice);
  writeStore(store);
  res.json({ ok:true, oldId: deviceId, newId, device: newDevice });
});

app.listen(PORT, ()=>console.log(`Auth server running on ${PORT}`));
