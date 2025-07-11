# 🚀 Options de Déploiement - Logawa Bot

## 📊 Comparaison des Plateformes

| Plateforme | Prix | 24h/24 | Logs | Fiabilité | Complexité |
|------------|------|--------|------|-----------|------------|
| **Railway** | $5/mois | ✅ | ✅ | ⭐⭐⭐⭐⭐ | Facile |
| **VPS** | $5-10/mois | ✅ | ✅ | ⭐⭐⭐⭐⭐ | Moyenne |
| **Render Payant** | $7/mois | ✅ | ✅ | ⭐⭐⭐⭐ | Facile |
| **Render Gratuit** | Gratuit | ❌ | ❌ | ⭐⭐ | Facile |
| **Replit** | Gratuit | ❌ | ❌ | ⭐ | Facile |

---

## 🏆 **RECOMMANDATION : Railway ($5/mois)**

### ✅ Avantages
- **Vraiment 24h/24** sans interruption
- **Logs persistants** et accessibles
- **Déploiement automatique** depuis GitHub
- **Interface simple** et intuitive
- **Support excellent**
- **Prix abordable** ($5/mois)

### 🚀 Déploiement Railway

1. **Créer un compte**
   - Allez sur [Railway.app](https://railway.app)
   - Connectez-vous avec GitHub

2. **Déployer le projet**
   - Cliquez "New Project"
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez votre repository Logawa

3. **Configurer les variables**
   ```
   DISCORD_TOKEN=votre_token_discord
   GUILD_ID=votre_guild_id
   STATUS_LOG_CHANNEL_ID=votre_channel_id
   MESSAGES_LOG_CHANNEL_ID=votre_channel_id
   FORBIDDEN_WORDS_LOG_CHANNEL_ID=votre_channel_id
   MODERATION_LOG_CHANNEL_ID=votre_channel_id
   IGNORED_CHANNELS=logs,announcements
   LOG_LEVEL=info
   WEBHOOK_URL=votre_webhook_url
   ```

4. **Déploiement automatique**
   - Railway déploie automatiquement à chaque push
   - Le bot reste en ligne 24h/24

---

## 🖥️ **Option 2 : VPS (Contrôle Total)**

### ✅ Avantages
- **Contrôle total** sur l'environnement
- **Logs persistants** sur disque
- **Vraiment 24h/24** garanti
- **Prix compétitif** ($5-10/mois)
- **Pas de limitations**

### 🚀 Déploiement VPS

#### **Étape 1 : Choisir un VPS**
- **DigitalOcean** : $5/mois (Droplet)
- **Vultr** : $5/mois (Cloud Compute)
- **Linode** : $5/mois (Nanode)

#### **Étape 2 : Configuration serveur**
```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2 (gestionnaire de processus)
npm install -g pm2

# Installer Git
sudo apt install git -y
```

#### **Étape 3 : Déployer le bot**
```bash
# Cloner le projet
git clone https://github.com/Martin-Die/Logawa.git
cd Logawa

# Installer les dépendances
npm install

# Créer le fichier .env
nano .env
```

#### **Étape 4 : Configuration .env**
```env
DISCORD_TOKEN=votre_token_discord
GUILD_ID=votre_guild_id
STATUS_LOG_CHANNEL_ID=votre_channel_id
MESSAGES_LOG_CHANNEL_ID=votre_channel_id
FORBIDDEN_WORDS_LOG_CHANNEL_ID=votre_channel_id
MODERATION_LOG_CHANNEL_ID=votre_channel_id
IGNORED_CHANNELS=logs,announcements
LOG_LEVEL=info
WEBHOOK_URL=votre_webhook_url
NODE_ENV=production
```

#### **Étape 5 : Démarrer avec PM2**
```bash
# Démarrer le bot
pm2 start index.js --name "logawa-bot"

# Configurer le démarrage automatique
pm2 startup
pm2 save

# Vérifier le statut
pm2 status
pm2 logs logawa-bot
```

---

## 💰 **Option 3 : Render Payant ($7/mois)**

### ✅ Avantages
- **Interface familière** si vous connaissez déjà Render
- **24h/24** garanti avec le plan payant
- **Logs persistants**
- **Déploiement simple**

### 🚀 Déploiement Render Payant

1. **Upgrader vers le plan Hobby ($7/mois)**
2. **Même processus** que le gratuit
3. **Le bot reste en ligne 24h/24**

---

## ⚠️ **Option 4 : Render Gratuit (LIMITÉ)**

### ❌ Limitations
- **Veille automatique** après 15 minutes
- **Redémarrage lent** (30-60 secondes)
- **Logs perdus** pendant la veille
- **Pas de 24h/24** réel

### 🔧 Solution Ping Externe

Si vous devez utiliser Render gratuit, utilisez le service de ping externe :

1. **Déployer le bot principal** sur Render
2. **Déployer le ping externe** sur un autre service gratuit
3. **Configurer le ping** toutes les 14 minutes

```bash
# Utiliser le fichier external-ping.js
# Déployer sur Replit ou autre service gratuit
# Configurer PING_URL vers votre Render app
```

---

## 📋 **Checklist de Déploiement**

### ✅ Avant le déploiement
- [ ] Bot Discord créé et configuré
- [ ] Token Discord généré
- [ ] Permissions configurées
- [ ] Channel de logs créé
- [ ] Variables d'environnement préparées

### ✅ Après le déploiement
- [ ] Bot en ligne dans Discord
- [ ] Logs fonctionnels
- [ ] Messages testés
- [ ] Modération testée
- [ ] Monitoring configuré

---

## 🆘 **Support et Dépannage**

### **Problèmes courants**
1. **Bot ne répond pas** → Vérifier les permissions
2. **Logs vides** → Vérifier les canaux de logs configurés
3. **Erreurs de token** → Vérifier DISCORD_TOKEN
4. **Bot déconnecté** → Vérifier la plateforme de déploiement

### **Logs utiles**
```bash
# Railway
railway logs

# VPS avec PM2
pm2 logs logawa-bot

# Render
# Voir dans le dashboard Render
```

---

## 🎯 **Recommandation Finale**

**Pour un bot de logging professionnel :**
1. **Railway $5/mois** - Meilleur rapport qualité/prix
2. **VPS $5/mois** - Contrôle total
3. **Render $7/mois** - Interface familière

**Évitez Render gratuit** pour un bot de production - les interruptions causeront des pertes de logs importantes. 