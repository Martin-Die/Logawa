#!/usr/bin/env node

const { spawn } = require('child_process');
const { logger } = require('./utils/logger');

console.log('🚀 Starting LIKO Discord Bot...');
console.log('📋 Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '✅ Set' : '❌ Missing');
console.log('- GUILD_ID:', process.env.GUILD_ID ? '✅ Set' : '❌ Missing');
console.log('- LOG_CHANNEL_ID:', process.env.LOG_CHANNEL_ID ? '✅ Set' : '❌ Missing');

// Vérifier les variables critiques
if (!process.env.DISCORD_TOKEN) {
    console.error('💥 DISCORD_TOKEN is required!');
    process.exit(1);
}

if (!process.env.GUILD_ID) {
    console.error('💥 GUILD_ID is required!');
    process.exit(1);
}

if (!process.env.LOG_CHANNEL_ID) {
    console.error('💥 LOG_CHANNEL_ID is required!');
    process.exit(1);
}

console.log('✅ All required environment variables are set');

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