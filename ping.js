const express = require('express');
const app = express();
const { logger } = require('./utils/logger');

// Ping endpoint to keep the bot alive
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        bot: 'Logawa Logger Bot'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Ping server started on port ${PORT}`);
});

module.exports = app; 