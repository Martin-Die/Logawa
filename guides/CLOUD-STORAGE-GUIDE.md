# ☁️ Guide de Stockage Cloud - Logawa Bot

## 📁 **Services de Stockage Disponibles**

Le bot Logawa peut maintenant stocker les fichiers TXT de logs dans le cloud pour un accès en ligne :

### **1. GitHub (GRATUIT) - Recommandé**
### **2. Google Drive (GRATUIT)**
### **3. Discord Webhook (Déjà configuré)**

---

## 🐙 **1. Configuration GitHub**

### **Avantages GitHub :**
- ✅ **Gratuit** - 100GB de stockage
- ✅ **Versioning** - Historique des modifications
- ✅ **API** - Upload automatique
- ✅ **Interface web** - Accès facile
- ✅ **Recherche** - Recherche dans les fichiers
- ✅ **URLs publiques** - Accès direct aux fichiers

### **Étape 1 : Créer un Repository GitHub**

1. **Allez sur [GitHub.com](https://github.com)**
2. **Cliquez "New repository"**
3. **Nom** : `logawa-logs` (ou autre nom)
4. **Description** : `Logs du bot Discord Logawa`
5. **Public** ou **Private** (selon vos préférences)
6. **Cliquez "Create repository"**

### **Étape 2 : Créer un Token GitHub**

1. **GitHub.com** → **Settings** → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)**
3. **Generate new token** → **Generate new token (classic)**
4. **Note** : `Logawa Bot Logs`
5. **Expiration** : `No expiration` (ou 90 jours)
6. **Scopes** : Cochez `repo` (accès complet aux repositories)
7. **Cliquez "Generate token"**
8. **Copiez le token** (important !)

### **Étape 3 : Configuration du Bot**

**Variables d'environnement à ajouter :**
```env
# GitHub Configuration
GITHUB_LOGGING_ENABLED=true
GITHUB_TOKEN=ghp_votre_token_ici
GITHUB_REPO=votre_username/logawa-logs
GITHUB_BRANCH=main
GITHUB_UPLOAD_INTERVAL=300000
```

### **Étape 4 : Test de la Configuration**

```bash
# Tester l'upload GitHub
node -e "
const GitHubLogger = require('./utils/github-logger');
const logger = new GitHubLogger();
logger.initialize().then(() => {
    logger.createAndUploadLog('test.log', 'Test log entry');
});
"
```

### **Accès aux Logs GitHub :**
- **URL générale** : `https://github.com/votre_username/logawa-logs/tree/main/logs`
- **URL du jour** : `https://github.com/votre_username/logawa-logs/tree/main/logs/2024/01/15`
- **Fichier spécifique** : `https://github.com/votre_username/logawa-logs/blob/main/logs/2024/01/15/all.log`

---

## 📁 **2. Configuration Google Drive**

### **Avantages Google Drive :**
- ✅ **Gratuit** - 15GB de stockage
- ✅ **Interface familière** - Google Drive
- ✅ **Partage facile** - Liens de partage
- ✅ **Synchronisation** - Avec votre compte Google
- ✅ **Recherche avancée** - Recherche Google

### **Étape 1 : Créer un Projet Google Cloud**

1. **Allez sur [Google Cloud Console](https://console.cloud.google.com/)**
2. **Créez un nouveau projet** ou sélectionnez un existant
3. **Activez l'API Google Drive** :
   - **APIs & Services** → **Library**
   - Recherchez "Google Drive API"
   - Cliquez "Enable"

### **Étape 2 : Créer un Compte de Service**

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **Service Account**
3. **Nom** : `logawa-bot`
4. **Description** : `Service account pour le bot Logawa`
5. **Cliquez "Create and Continue"**
6. **Role** : `Editor` (ou `Viewer` si vous voulez seulement lire)
7. **Cliquez "Done"**

### **Étape 3 : Télécharger les Credentials**

1. **Cliquez sur le compte de service créé**
2. **Onglet "Keys"**
3. **Add Key** → **Create new key**
4. **JSON** → **Create**
5. **Téléchargez le fichier JSON**

### **Étape 4 : Créer un Dossier Google Drive**

1. **Allez sur [Google Drive](https://drive.google.com)**
2. **Créez un nouveau dossier** : `Logawa Logs`
3. **Clic droit** → **Partager**
4. **Ajoutez l'email du compte de service** (trouvé dans le JSON)
5. **Donnez les permissions** : `Editor`

### **Étape 5 : Obtenir l'ID du Dossier**

1. **Ouvrez le dossier** dans Google Drive
2. **L'URL ressemble à** : `https://drive.google.com/drive/folders/1ABC123DEF456GHI789JKL`
3. **L'ID du dossier** : `1ABC123DEF456GHI789JKL`

### **Étape 6 : Configuration du Bot**

**Variables d'environnement à ajouter :**
```env
# Google Drive Configuration
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_FOLDER_ID=1ABC123DEF456GHI789JKL
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
GOOGLE_DRIVE_UPLOAD_INTERVAL=300000
```

**Note** : Le `GOOGLE_DRIVE_CREDENTIALS` doit être le contenu JSON complet du fichier téléchargé.

### **Accès aux Logs Google Drive :**
- **URL du dossier** : `https://drive.google.com/drive/folders/1ABC123DEF456GHI789JKL`
- **Fichiers** : Organisés par date (ex: `2024-01-15_all.log`)

---

## 🔧 **3. Configuration Combinée**

### **Utiliser Plusieurs Services**

Vous pouvez activer plusieurs services en même temps :

```env
# Discord (déjà configuré)
DISCORD_TOKEN=votre_token_discord
LOG_CHANNEL_ID=votre_channel_id
WEBHOOK_URL=votre_webhook_url

# GitHub
GITHUB_LOGGING_ENABLED=true
GITHUB_TOKEN=ghp_votre_token_github
GITHUB_REPO=votre_username/logawa-logs

# Google Drive
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_FOLDER_ID=votre_folder_id
GOOGLE_DRIVE_CREDENTIALS=votre_json_credentials
```

### **Priorité des Services**

1. **Discord** : Logs en temps réel
2. **Fichiers locaux** : Stockage temporaire
3. **GitHub** : Stockage permanent + versioning
4. **Google Drive** : Stockage permanent + partage

---

## 📊 **4. Commandes de Gestion**

### **Vérifier le Statut**

```bash
# Statut GitHub
node -e "
const GitHubLogger = require('./utils/github-logger');
const logger = new GitHubLogger();
console.log(logger.getStatus());
"

# Statut Google Drive
node -e "
const GoogleDriveLogger = require('./utils/drive-logger');
const logger = new GoogleDriveLogger();
logger.initialize().then(() => {
    console.log(logger.getStatus());
});
"
```

### **Upload Manuel**

```bash
# Upload vers GitHub
node -e "
const GitHubLogger = require('./utils/github-logger');
const logger = new GitHubLogger();
logger.uploadAllLogs();
"

# Upload vers Google Drive
node -e "
const GoogleDriveLogger = require('./utils/drive-logger');
const logger = new GoogleDriveLogger();
logger.initialize().then(() => {
    logger.uploadAllLogs();
});
"
```

### **Lister les Fichiers**

```bash
# Lister les fichiers GitHub
node -e "
const GitHubLogger = require('./utils/github-logger');
const logger = new GitHubLogger();
console.log('GitHub Logs URL:', logger.getLogsUrl());
"

# Lister les fichiers Google Drive
node -e "
const GoogleDriveLogger = require('./utils/drive-logger');
const logger = new GoogleDriveLogger();
logger.initialize().then(() => {
    logger.listFiles().then(files => {
        console.log('Google Drive Files:', files);
    });
});
"
```

---

## 🚨 **5. Dépannage**

### **Problèmes GitHub**

#### **Erreur 401 (Unauthorized)**
- Vérifiez que le token GitHub est correct
- Vérifiez que le token a les permissions `repo`
- Vérifiez que le repository existe et est accessible

#### **Erreur 404 (Not Found)**
- Vérifiez que le repository existe
- Vérifiez le format : `username/repository`
- Vérifiez que le repository n'est pas privé (si token personnel)

#### **Erreur de Rate Limit**
- GitHub limite à 5000 requêtes/heure pour les comptes personnels
- Réduisez `GITHUB_UPLOAD_INTERVAL` à 600000 (10 minutes)

### **Problèmes Google Drive**

#### **Erreur d'Authentification**
- Vérifiez que le fichier JSON des credentials est correct
- Vérifiez que l'API Google Drive est activée
- Vérifiez que le compte de service a accès au dossier

#### **Erreur de Permissions**
- Vérifiez que le compte de service est ajouté au dossier
- Vérifiez que les permissions sont `Editor`
- Vérifiez que le dossier existe

#### **Erreur de Quota**
- Google Drive limite à 10,000 requêtes/jour
- Réduisez `GOOGLE_DRIVE_UPLOAD_INTERVAL` à 600000 (10 minutes)

---

## 📈 **6. Monitoring et Statistiques**

### **Script de Monitoring**

```bash
#!/bin/bash
# Script de monitoring des services cloud

echo "=== STATUT DES SERVICES CLOUD ==="

# GitHub Status
echo "GitHub:"
node -e "
const GitHubLogger = require('./utils/github-logger');
const logger = new GitHubLogger();
const status = logger.getStatus();
console.log('  Enabled:', status.enabled);
console.log('  Repository:', status.repository);
console.log('  Queue Size:', status.queueSize);
console.log('  URL:', status.logsUrl);
"

# Google Drive Status
echo "Google Drive:"
node -e "
const GoogleDriveLogger = require('./utils/drive-logger');
const logger = new GoogleDriveLogger();
logger.initialize().then(() => {
    const status = logger.getStatus();
    console.log('  Enabled:', status.enabled);
    console.log('  Folder ID:', status.folderId);
    console.log('  Queue Size:', status.queueSize);
    console.log('  URL:', status.logsUrl);
});
"
```

---

## 🎯 **7. Recommandations**

### **Pour Débuter**
1. **GitHub** : Plus simple à configurer, gratuit, versioning
2. **Discord Webhook** : Déjà configuré, temps réel

### **Pour Production**
1. **GitHub** : Stockage principal
2. **Google Drive** : Sauvegarde + partage
3. **Discord** : Notifications temps réel

### **Sécurité**
- **Tokens** : Gardez-les secrets
- **Repository** : Privé si logs sensibles
- **Permissions** : Minimum nécessaire
- **Rotation** : Changez les tokens régulièrement

---

## 📞 **8. Support**

### **Liens Utiles**
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Discord Webhook Documentation](https://discord.com/developers/docs/resources/webhook)

### **Problèmes Courants**
1. **Rate limits** : Réduisez la fréquence d'upload
2. **Permissions** : Vérifiez les tokens et accès
3. **Quota** : Surveillez l'utilisation
4. **Erreurs réseau** : Le bot retentera automatiquement 