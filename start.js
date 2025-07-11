#!/usr/bin/env node

const { spawn } = require('child_process');
const { logger } = require('./utils/logger');

console.log('🚀 Starting LIKO Discord Bot...');

// Vérifier les variables critiques
if (!process.env.DISCORD_TOKEN) {
    console.error('💥 DISCORD_TOKEN is required!');
    process.exit(1);
}

if (!process.env.GUILD_ID) {
    console.error('💥 GUILD_ID is required!');
    process.exit(1);
}

// Vérifier qu'au moins un canal de log est configuré
const hasLogChannels = process.env.STATUS_LOG_CHANNEL_ID || 
                      process.env.MESSAGES_LOG_CHANNEL_ID || 
                      process.env.FORBIDDEN_WORDS_LOG_CHANNEL_ID || 
                      process.env.MODERATION_LOG_CHANNEL_ID;

if (!hasLogChannels) {
    console.error('💥 At least one log channel ID is required! (STATUS_LOG_CHANNEL_ID, MESSAGES_LOG_CHANNEL_ID, FORBIDDEN_WORDS_LOG_CHANNEL_ID, or MODERATION_LOG_CHANNEL_ID)');
    process.exit(1);
}



// Démarrer le bot avec un timeout
const botProcess = spawn('node', ['index.js'], {
    stdio: 'inherit',
    env: process.env
});

// Timeout de 30 secondes pour le démarrage
const startupTimeout = setTimeout(() => {
    console.error('💥 Bot startup timeout after 30 seconds');
    botProcess.kill('SIGTERM');
    process.exit(1);
}, 30000);

botProcess.on('close', (code) => {
    clearTimeout(startupTimeout);
    console.log(`Bot process exited with code ${code}`);
    process.exit(code);
});

botProcess.on('error', (error) => {
    clearTimeout(startupTimeout);
    console.error('💥 Failed to start bot process:', error);
    process.exit(1);
});

// Gestion des signaux
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    botProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    botProcess.kill('SIGTERM');
}); 