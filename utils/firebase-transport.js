const Transport = require('winston-transport');
const FirebaseLogger = require('./firebase-logger');

class FirebaseTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.firebaseLogger = new FirebaseLogger();
        this.initializeFirebase();
    }

    async initializeFirebase() {
        await this.firebaseLogger.initialize();
    }

    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            await this.firebaseLogger.queueLogUpload({
                level: info.level,
                message: info.message,
                metadata: {
                    timestamp: info.timestamp,
                    label: info.label,
                    ...info
                }
            });
        } catch (error) {
            console.error('❌ Erreur Firebase Transport:', error.message);
        }

        if (callback) {
            callback();
        }
    }

    async close() {
        await this.firebaseLogger.cleanup();
    }
}

module.exports = FirebaseTransport; 