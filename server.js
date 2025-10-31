const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.')); // serve static files

const LOGIN_FILE = './login.json';

// Helper: read or create login.json
function readLogins() {
    if (!fs.existsSync(LOGIN_FILE)) {
        fs.writeFileSync(LOGIN_FILE, JSON.stringify({users:[], oneTime:[]}, null, 2));
    }
    return JSON.parse(fs.readFileSync(LOGIN_FILE));
}

function saveLogins(data) {
    fs.writeFileSync(LOGIN_FILE, JSON.stringify(data, null, 2));
}

// Generate random string
function randomStr(length=8){
    return crypto.randomBytes(length).toString('hex');
}

// --- API Endpoints ---

// List one-time logins
app.get('/api/list', (req,res)=>{
    const data = readLogins();
    res.json(data);
});

// Generate one-time login (POST: admin only)
app.post('/api/generate', (req,res)=>{
    const {adminUser, adminPass} = req.body;
    if(adminUser !== 'lukas' || adminPass !== 'lukas') return res.status(403).json({error:'Unauthorized'});
    
    const data = readLogins();
    const username = 'user_' + randomStr(3);
    const password = randomStr(4);
    const id = randomStr(6);
    
    data.oneTime.push({username,password,id,used:false});
    saveLogins(data);
    res.json({username,password,id});
});

// Login endpoint
app.post('/api/login', (req,res)=>{
    const {username,password} = req.body;
    const data = readLogins();

    // Admin login
    if(username === 'lukas' && password === 'lukas') {
        return res.json({ok:true,isAdmin:true,deviceId:'ADMIN'});
    }

    // Check one-time logins
    const user = data.oneTime.find(u=>u.username===username && u.password===password);
    if(!user) return res.json({ok:false,error:'Invalid credentials'});
    if(user.used) return res.json({ok:false,error:'Already used'});

    // Mark used
    user.used = true;
    saveLogins(data);
    res.json({ok:true,isAdmin:false,deviceId:user.id});
});

// Revoke or refresh ID (admin only)
app.post('/api/revoke', (req,res)=>{
    const {adminUser, adminPass, deviceId} = req.body;
    if(adminUser !== 'lukas' || adminPass !== 'lukas') return res.status(403).json({error:'Unauthorized'});
    const data = readLogins();
    let user = data.oneTime.find(u=>u.id===deviceId);
    if(!user) return res.json({error:'Device not found'});
    user.used = true; // revoke
    saveLogins(data);
    res.json({ok:true});
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
