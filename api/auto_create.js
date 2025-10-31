import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const loginFile = './login.json';
    let logins = [];

    // Read existing logins
    if (fs.existsSync(loginFile)) {
      logins = JSON.parse(fs.readFileSync(loginFile));
    }

    // Generate one-time login
    const deviceId = 'dev-' + uuidv4().slice(0, 8);
    const username = 'u_' + Math.random().toString(36).slice(2, 8);
    const password = Math.random().toString(36).slice(2, 10);

    const newLogin = { deviceId, username, password };
    logins.push(newLogin);

    fs.writeFileSync(loginFile, JSON.stringify(logins, null, 2));

    res.status(200).json({ ok: true, ...newLogin });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
}
