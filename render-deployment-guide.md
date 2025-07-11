# 🚀 Guide de Déploiement Render pour Logawa Bot

## 📋 Prérequis

- Un compte GitHub avec le code du bot
- Un compte Render.com
- Un bot Discord configuré

## 🔧 Étape 1 : Préparer le Repository

### 1.1 Forker le Repository
1. Allez sur GitHub et trouvez ce repository
2. Cliquez sur "Fork" en haut à droite
3. Clonez votre fork localement

### 1.2 Vérifier les Fichiers
Assurez-vous d'avoir ces fichiers dans votre repository :
- ✅ `index.js`
- ✅ `ping.js`
- ✅ `package.json`
- ✅ `render.yaml`
- ✅ `config.js`
- ✅ `utils/logger.js`
- ✅ `events/messageEvents.js`
- ✅ `events/moderationEvents.js`
- ✅ `events/serverEvents.js`
- ✅ `README.md`
- ✅ `render-deployment-guide.md`

## 🌐 Étape 2 : Créer un Compte Render

1. Allez sur [Render.com](https://render.com)
2. Cliquez sur "Get Started"
3. Créez un compte avec GitHub (recommandé)

## 🚀 Étape 3 : Déployer le Bot

### 3.1 Créer un Nouveau Service
1. Dans le dashboard Render, cliquez sur "New +"
2. Sélectionnez "Web Service"
3. Connectez votre compte GitHub si ce n'est pas déjà fait
4. Sélectionnez votre repository

### 3.2 Configurer le Service
Remplissez les champs suivants :

| Champ | Valeur |
|-------|--------|
| **Name** | `Logawa-discord-bot` |
| **Environment** | `Node` |
| **Region** | `Frankfurt (EU Central)` (ou plus proche) |
| **Branch** | `main` (ou votre branche principale) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |

### 3.3 Ajouter les Variables d'Environnement
Dans la section "Environment Variables", ajoutez :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Token de votre bot Discord | `votre_token_discord_ici` |
| `GUILD_ID` | ID de votre serveur Discord | `votre_guild_id_ici` |
| `STATUS_LOG_CHANNEL_ID` | ID du canal de statut | `votre_channel_id_ici` |
| `MESSAGES_LOG_CHANNEL_ID` | ID du canal des messages | `votre_channel_id_ici` |
| `FORBIDDEN_WORDS_LOG_CHANNEL_ID` | ID du canal des mots interdits | `votre_channel_id_ici` |
| `MODERATION_LOG_CHANNEL_ID` | ID du canal de modération | `votre_channel_id_ici` |
| `IGNORED_CHANNELS` | Salons à ignorer (optionnel) | `channel_id_1,channel_id_2` |
| `LOG_LEVEL` | Niveau de log | `info` |
| `WEBHOOK_URL` | Webhook Discord pour logs externes (optionnel) | `votre_webhook_url_ici` |

### 3.4 Déployer
1. Cliquez sur "Create Web Service"
2. Render va automatiquement :
   - Cloner votre repository
   - Installer les dépendances
   - Démarrer le bot
   - Créer une URL publique

## ✅ Étape 4 : Vérifier le Déploiement

### 4.1 Vérifier les Logs
1. Dans le dashboard Render, cliquez sur votre service
2. Allez dans l'onglet "Logs"
3. Vérifiez que vous voyez :
   ```
   [INFO] Initializing Logawa Logger Bot...
   [INFO] Bot is ready!
   [INFO] Logawa Logger Bot is now online and ready!
   ```

### 4.2 Tester le Health Check
1. Copiez l'URL de votre service (ex: `https://Logawa-bot.onrender.com`)
2. Ajoutez `/health` à la fin
3. Vous devriez voir :
   ```json
   {
     "status": "healthy",
     "memory": {...},
     "uptime": 123.45
   }
   ```

### 4.3 Vérifier Discord
1. Allez dans votre serveur Discord
2. Vérifiez que le bot est en ligne
3. Vérifiez qu'il a le statut "Watching Logging Server Activity"
4. Testez en envoyant un message dans un salon

## 📊 Étape 5 : Accéder aux Logs

### 5.1 Logs Render
- **Dashboard** : Allez dans votre service → "Logs"
- **Temps réel** : Les logs s'affichent en temps réel
- **Téléchargement** : Cliquez sur "Download" pour sauvegarder

### 5.2 Logs Discord
- **Salon de logs** : Tous les événements sont envoyés dans le salon configuré
- **Webhook** : Si configuré, logs supplémentaires via webhook

### 5.3 Commandes Utiles
```bash
# Vérifier le statut du service
curl https://votre-app.onrender.com/health

# Voir les logs en temps réel
# (via le dashboard Render)
```

## 🔄 Étape 6 : Mise à Jour

### 6.1 Mise à Jour Automatique
- Render redéploie automatiquement quand vous poussez sur GitHub
- Pas besoin de redémarrage manuel

### 6.2 Mise à Jour Manuelle
1. Dans le dashboard Render
2. Cliquez sur "Manual Deploy"
3. Sélectionnez "Deploy latest commit"

## 🚨 Dépannage

### Problème : Bot ne démarre pas
**Solution :**
1. Vérifiez les logs dans Render
2. Vérifiez que toutes les variables d'environnement sont définies
3. Vérifiez que le token Discord est correct

### Problème : Bot ne répond pas
**Solution :**
1. Vérifiez que le bot est invité sur le serveur
2. Vérifiez les permissions du bot
3. Vérifiez que l'ID du serveur est correct

### Problème : Pas de logs dans Discord
**Solution :**
1. Vérifiez l'ID du salon de logs
2. Vérifiez que le bot peut envoyer des messages
3. Vérifiez les permissions du salon

### Problème : Service s'arrête
**Solution :**
1. Render redémarre automatiquement
2. Vérifiez les logs pour les erreurs
3. Le plan gratuit peut avoir des limitations

## 💡 Avantages de Render

### ✅ Avantages
- **Gratuit** : 750h/mois gratuites
- **Automatique** : Redémarrage automatique
- **Logs persistants** : Accès aux logs via dashboard
- **Simple** : Configuration facile
- **Fiable** : Plus stable qu'Heroku gratuit

### ⚠️ Limitations
- **Plan gratuit** : 750h/mois (environ 31 jours)
- **Veille** : Le service peut s'endormir après inactivité
- **Ressources** : Limitées sur le plan gratuit

## 🎯 Recommandations

### Pour un Usage Personnel
- Le plan gratuit Render est parfait
- 750h/mois suffisent pour un bot de logs
- Configuration simple et fiable

### Pour un Usage Professionnel
- Considérez le plan payant Render ($7/mois)
- Ou passez à un VPS pour plus de contrôle

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans le dashboard Render
2. Vérifiez la configuration Discord
3. Consultez la documentation Render
4. Créez une issue sur GitHub

---

**🎉 Félicitations !** Votre bot Logawa est maintenant déployé sur Render et fonctionne 24h/24 ! 