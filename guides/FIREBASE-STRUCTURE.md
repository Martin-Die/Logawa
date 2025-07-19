# Structure organisée Firebase pour Logawa

## 🗂️ Organisation des données

Firebase utilise maintenant la même structure organisée que les fichiers locaux :

```
logs/
├── messages/
│   └── 2025/
│       └── 07/
│           └── 17/
│               ├── [log-id-1] - { level: "info", message: "...", ... }
│               ├── [log-id-2] - { level: "error", message: "...", ... }
│               └── ...
├── moderation/
│   └── 2025/
│       └── 07/
│           └── 17/
│               └── [log-id-3] - { level: "info", message: "...", ... }
├── status/
│   └── 2025/
│       └── 07/
│           └── 17/
│               └── [log-id-4] - { level: "info", message: "...", ... }
├── forbiddenWords/
│   └── 2025/
│       └── 07/
│           └── 17/
│               └── [log-id-5] - { level: "warn", message: "...", ... }
└── errors/
    └── 2025/
        └── 07/
            └── 17/
                └── [log-id-6] - { level: "error", message: "...", ... }
```

## 📊 Structure des documents

Chaque log contient :

```json
{
  "id": "unique-log-id",
  "level": "info|error|warn|debug",
  "message": "Message du log",
  "timestamp": "2025-07-17T10:30:00.000Z",
  "metadata": {
    "logType": "messages",
    "timestamp": "2025-07-17 10:30:00",
    "additional": "data"
  },
  "source": "logawa-bot",
  "year": "2025",
  "month": "07",
  "day": "17",
  "logType": "messages",
  "collectionPath": "logs/messages/2025/07/17"
}
```

## 🔍 Requêtes organisées

### 1. Logs récents (tous types)
```javascript
const recentLogs = await firebaseLogger.listRecentLogs(10);
```

### 2. Logs d'une date spécifique
```javascript
const logsByDate = await firebaseLogger.listLogsByDate('messages', '2025', '07', '17');
```

### 3. Logs d'un mois
```javascript
const logsByMonth = await firebaseLogger.listLogsByMonth('messages', '2025', '07');
```

## 🎯 Avantages de cette structure

### ✅ Navigation temporelle
- Accès direct aux logs d'une période spécifique
- Recherche rapide par date
- Organisation claire par année/mois/jour

### ✅ Performance
- Requêtes plus rapides sur des collections plus petites
- Index automatiques par date
- Moins de données à parcourir

### ✅ Gestion efficace
- Suppression facile des anciens logs
- Archivage par période
- Analyse temporelle simplifiée

### ✅ Cohérence
- Même structure que les fichiers locaux
- Migration facile entre local et cloud
- Interface unifiée

## 🔧 Utilisation dans la console Firebase

1. **Navigation** : `Firestore Database` → `logs` → `messages` → `2025` → `07` → `17`
2. **Recherche** : Utilisez les requêtes Firestore avec les chemins organisés
3. **Export** : Exportez par collection pour des périodes spécifiques
4. **Analyse** : Utilisez les métadonnées pour filtrer et trier

## 📈 Exemples de requêtes Firestore

### Logs d'erreurs d'aujourd'hui
```javascript
db.collection('logs/errors/2025/07/17')
  .where('level', '==', 'error')
  .orderBy('timestamp', 'desc')
```

### Logs de modération du mois
```javascript
db.collectionGroup('logs/moderation/2025/07')
  .orderBy('timestamp', 'desc')
  .limit(100)
```

### Statistiques par type
```javascript
db.collection('logs/messages/2025/07/17')
  .get()
  .then(snapshot => {
    const count = snapshot.size;
    console.log(`Messages du jour: ${count}`);
  });
```

## 🚀 Migration

Si vous aviez des logs dans l'ancienne structure plate (`logs` collection), ils resteront accessibles. Les nouveaux logs utiliseront automatiquement la structure organisée.

La structure organisée est maintenant active ! 🎉 