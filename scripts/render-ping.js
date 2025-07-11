const https = require('https');
const http = require('http');

// Configuration pour Render
const PING_URL = process.env.PING_URL || 'https://logawa-discord-bot.onrender.com/ping';
const PING_INTERVAL = 3 * 60 * 1000; // 3 minutes pour Render

console.log(`🚀 Starting Render ping service...`);
console.log(`🎯 Target: ${PING_URL}`);
console.log(`⏰ Interval: ${PING_INTERVAL / 1000} seconds`);

function pingServer() {
    const url = new URL(PING_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            const now = new Date().toISOString();
            try {
                const response = JSON.parse(data);
                console.log(`✅ [${now}] Ping successful - Status: ${res.statusCode} - Uptime: ${response.uptime}s`);
            } catch (error) {
                console.log(`⚠️ [${now}] Ping response: ${data}`);
            }
        });
    });
    
    req.on('error', (error) => {
        const now = new Date().toISOString();
        console.error(`❌ [${now}] Ping failed: ${error.message}`);
    });
    
    req.setTimeout(10000, () => {
        req.destroy();
        const now = new Date().toISOString();
        console.error(`⏰ [${now}] Ping timeout`);
    });
}

// Premier ping immédiat
pingServer();

// Pings réguliers
setInterval(pingServer, PING_INTERVAL);

// Gestion de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ping service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down ping service...');
    process.exit(0);
}); 