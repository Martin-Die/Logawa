# Configuration Firebase pour Logawa

## 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Créer un projet"
3. Donnez un nom à votre projet (ex: "logawa-logs")
4. Suivez les étapes de configuration

## 2. Activer Firestore Database

1. Dans votre projet Firebase, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Mode production" ou "Mode test" (vous pourrez changer plus tard)
4. Choisissez l'emplacement de votre base de données (ex: europe-west1)

## 3. Créer un compte de service

1. Dans Firebase Console, allez dans "Paramètres du projet" (icône engrenage)
2. Allez dans l'onglet "Comptes de service"
3. Cliquez sur "Générer une nouvelle clé privée"
4. Téléchargez le fichier JSON

## 4. Configurer les credentials

1. Renommez le fichier téléchargé en `firebase-credentials.json`
2. Placez-le à la racine de votre projet Logawa
3. Le fichier doit contenir les informations de votre compte de service

## 5. Règles Firestore (optionnel)

Par défaut, Firestore est en mode test. Pour la production, configurez les règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /logs/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 6. Tester la configuration

```bash
node scripts/test-firebase.js
```

## Structure des données

Les logs seront stockés dans la collection `logs` avec cette structure :

```json
{
  "id": "unique-id",
  "level": "info|error|warn|debug",
  "message": "Message du log",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "logType": "messages|moderation|status|errors",
    "additional": "data"
  },
  "source": "logawa-bot"
}
```

## Avantages de Firebase

- ✅ Plus simple à configurer que Google Drive
- ✅ Pas de problèmes d'authentification OAuth2
- ✅ Requêtes en temps réel
- ✅ Interface web pour consulter les logs
- ✅ Pas de limite de quota pour les petits projets
- ✅ Sauvegarde automatique

## Migration depuis Google Drive

1. Supprimez `google-credentials.json`
2. Supprimez les scripts Google Drive
3. Configurez Firebase comme ci-dessus
4. Testez avec `node scripts/test-firebase.js`
5. Redémarrez le bot

Les logs seront maintenant envoyés vers Firebase au lieu de Google Drive ! 