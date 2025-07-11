# Guide de déploiement Zeabur pour LIKO Discord Bot

Ce guide vous explique comment déployer votre bot Discord LIKO sur Zeabur en utilisant votre Dockerfile existant.

## 🚀 Avantages de Zeabur

- ✅ Support natif Docker
- ✅ Connexions WebSocket persistantes (parfait pour Discord)
- ✅ Variables d'environnement sécurisées
- ✅ Logs en temps réel
- ✅ Redémarrage automatique
- ✅ Gratuit pour les projets personnels

## 📋 Prérequis

1. **Compte Zeabur** : https://zeabur.com
2. **Votre code sur GitHub/GitLab** (recommandé)
3. **Token Discord Bot** configuré
4. **IDs Discord** (serveur et canal de logs)

## 🔧 Configuration

### 1. Fichier de configuration Zeabur

Le fichier `zeabur.toml` est déjà configuré avec :
- **Builder** : DOCKERFILE (utilise votre Dockerfile)
- **Port** : 3000 (pour les endpoints de santé)
- **Health check** : `/health` toutes les 30 secondes

### 2. Variables d'environnement

Vous devrez configurer ces variables dans l'interface Zeabur :

```bash
DISCORD_TOKEN=votre_token_discord_ici
GUILD_ID=votre_id_serveur_ici
LOG_CHANNEL_ID=votre_id_canal_logs_ici
IGNORED_CHANNELS=channel_id_1,channel_id_2
LOG_LEVEL=info
NODE_ENV=production
```

## 🚀 Déploiement

### Étape 1 : Préparer votre repository

1. **Poussez votre code vers GitHub/GitLab** :
   ```bash
   git add .
   git commit -m "Configuration Zeabur"
   git push origin main
   ```

2. **Vérifiez que ces fichiers sont présents** :
   - ✅ `Dockerfile`
   - ✅ `zeabur.toml`
   - ✅ `package.json`
   - ✅ `index.js`

### Étape 2 : Déployer sur Zeabur

1. **Connectez-vous à Zeabur** : https://zeabur.com
2. **Cliquez sur "New Project"**
3. **Choisissez "Import from Git"**
4. **Sélectionnez votre repository**
5. **Zeabur détectera automatiquement le Dockerfile**

### Étape 3 : Configurer les variables d'environnement

1. **Dans votre projet Zeabur**, allez dans "Settings"
2. **Cliquez sur "Environment Variables"**
3. **Ajoutez chaque variable** :
   ```
   DISCORD_TOKEN=votre_vrai_token
   GUILD_ID=votre_vrai_id_serveur
   LOG_CHANNEL_ID=votre_vrai_id_canal
   IGNORED_CHANNELS=channel_id_1,channel_id_2
   LOG_LEVEL=info
   NODE_ENV=production
   ```

### Étape 4 : Déployer

1. **Cliquez sur "Deploy"**
2. **Attendez la construction** (2-5 minutes)
3. **Vérifiez les logs** pour s'assurer que tout fonctionne

## 📊 Surveillance

### Logs en temps réel

Dans l'interface Zeabur :
- **Onglet "Logs"** : Voir les logs en temps réel
- **Onglet "Metrics"** : Surveillance des ressources

### Endpoints de santé

Votre bot expose ces endpoints :
- `https://votre-projet.zeabur.app/` - Statut général
- `https://votre-projet.zeabur.app/health` - Santé du bot
- `https://votre-projet.zeabur.app/status` - Informations détaillées
- `https://votre-projet.zeabur.app/ping` - Test de connectivité

## 🔄 Mises à jour

### Déploiement automatique

Zeabur redéploie automatiquement quand vous poussez sur votre branche principale.

### Déploiement manuel

1. **Poussez vos changements** vers GitHub/GitLab
2. **Zeabur détecte automatiquement** les changements
3. **Redéploie automatiquement** votre bot

## 🛠️ Dépannage

### Problèmes courants

1. **Le bot ne démarre pas**
   - Vérifiez les variables d'environnement
   - Consultez les logs dans l'interface Zeabur

2. **Erreur de build**
   - Vérifiez que le Dockerfile est correct
   - Assurez-vous que tous les fichiers sont présents

3. **Le bot ne se connecte pas à Discord**
   - Vérifiez le token Discord
   - Assurez-vous que les IDs sont corrects

### Logs utiles

```bash
# Dans l'interface Zeabur, cherchez ces messages :
"Bot is ready!"
"Logged in as: Logawa#8091"
"All required permissions are present"
```

## 🌐 Domaine personnalisé (Optionnel)

1. **Dans les paramètres Zeabur**, allez dans "Domains"
2. **Ajoutez votre domaine personnalisé**
3. **Configurez les DNS** selon les instructions

## 💰 Coûts

- **Gratuit** : Jusqu'à 512MB RAM, 1 CPU
- **Payant** : À partir de $5/mois pour plus de ressources

## 🎉 Félicitations !

Votre bot LIKO est maintenant déployé sur Zeabur et fonctionne 24/7 !

### Prochaines étapes

1. **Testez les fonctionnalités** dans votre serveur Discord
2. **Surveillez les logs** pour détecter d'éventuels problèmes
3. **Configurez des alertes** si nécessaire
4. **Sauvegardez vos logs** régulièrement

## 📞 Support

- **Documentation Zeabur** : https://docs.zeabur.com
- **Discord Zeabur** : https://discord.gg/zeabur
- **Issues GitHub** : Pour les problèmes spécifiques au bot 