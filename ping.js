const express = require('express');
const app = express();
const { logger } = require('./utils/logger');

// Ping endpoint to keep the bot alive
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: 'Logawa Logger Bot',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        bot: 'Logawa Logger Bot'
    });
});

// Status endpoint for monitoring
app.get('/status', (req, res) => {
    res.json({
        bot: {
            name: 'Logawa Logger Bot',
            version: '1.0.0',
            status: 'online',
            uptime: process.uptime()
        },
        system: {
            memory: process.memoryUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        },
        environment: {
            nodeEnv: process.env.NODE_ENV || 'production',
            guildId: process.env.GUILD_ID ? 'configured' : 'not configured',
            logChannelId: process.env.LOG_CHANNEL_ID ? 'configured' : 'not configured'
        }
    });
});

// Ping endpoint for external services
app.get('/ping', (req, res) => {
    res.json({
        pong: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Keep-alive endpoint spécifiquement pour Render
app.get('/keep-alive', (req, res) => {
    res.json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'Logawa Discord Bot',
        platform: 'Render'
    });
});

// Endpoint pour les services de monitoring externes
app.get('/monitor', (req, res) => {
    res.status(200).send('OK');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Ping server started on port ${PORT}`);
    logger.info(`Health check available at: http://localhost:${PORT}/health`);
    logger.info(`Status available at: http://localhost:${PORT}/status`);
    logger.info(`Ping available at: http://localhost:${PORT}/ping`);
    logger.info(`Keep-alive available at: http://localhost:${PORT}/keep-alive`);
});

module.exports = app; 