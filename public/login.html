<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Login - ReallyUnb0ck3d (Auto)</title>
<style>
:root{--p1:#6a0dad;--p2:#2e2e4f}
body{margin:0;font-family:Arial;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--p1),var(--p2));color:#fff}
.card{width:380px;background:rgba(0,0,0,0.45);padding:22px;border-radius:12px}
.small{font-size:13px;opacity:0.9;margin-top:8px}
.cred{background:rgba(255,255,255,0.04);padding:8px;border-radius:8px;margin-top:12px;font-family:monospace}
</style>
</head>
<body>
  <div class="card">
    <h2>Welcome — creating your device login...</h2>
    <div class="small">A device‑bound login will be created automatically and stored on this device only.</div>

    <div id="status" class="small">Waiting...</div>
    <div id="creds" class="cred" style="display:none;"></div>
  </div>

<script>
async function autoCreateAndLogin(){
  // if deviceId already exists, skip creation and validate with server
  const existing = localStorage.getItem('deviceId');
  if (existing) {
    document.getElementById('status').innerText = 'Device already has credentials — validating...';
    // validate
    try {
      const resp = await fetch('/api/validate', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId: existing })
      });
      const j = await resp.json();
      if (j.ok && j.valid) {
        document.getElementById('status').innerText = 'Validated — redirecting...';
        // open blank tab and redirect
        window.open('about:blank','_blank');
        window.location.href = '/site.html';
        return;
      } else {
        // invalid -> clear and create a fresh one
        localStorage.removeItem('deviceId');
      }
    } catch(e){ console.error(e); /* fallthrough to create new */ }
  }

  document.getElementById('status').innerText = 'Requesting server to create a device credential...';

  try {
    const res = await fetch('/api/auto_create', { method:'POST', headers:{'Content-Type':'application/json'} });
    if (!res.ok) throw new Error('create failed');
    const data = await res.json();
    if (!data.ok) throw new Error('create returned error');

    // store device id permanently in localStorage
    localStorage.setItem('deviceId', data.deviceId);

    // show credentials to user (for your records). They cannot use them on a different device because server bound them
    document.getElementById('creds').style.display = 'block';
    document.getElementById('creds').innerHTML = `<strong>username:</strong> ${data.username}<br><strong>password:</strong> ${data.password}<br><small style="opacity:0.85">This login is bound to this device only.</small>`;

    document.getElementById('status').innerText = 'Created and bound to this device — redirecting...';

    // open blank tab and redirect main tab to site
    window.open('about:blank','_blank');
    setTimeout(()=>{ window.location.href = '/site.html'; }, 700);

  } catch (err) {
    console.error(err);
    document.getElementById('status').innerText = 'Error creating device credential. Check server.';
  }
}

autoCreateAndLogin();
</script>
</body>
</html>
