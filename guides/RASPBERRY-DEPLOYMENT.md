# 🍓 Déploiement Automatique sur Raspberry Pi

Ce guide explique comment configurer votre bot Discord pour qu'il démarre automatiquement sur votre Raspberry Pi et se mette à jour quand vous faites des modifications sur votre PC.

## 📋 Prérequis

- Raspberry Pi avec Debian/Ubuntu
- Accès SSH configuré
- Clé SSH configurée sur votre PC

## 🚀 Installation Initiale

### 1. Copier le projet sur la Raspberry Pi

```bash
# Depuis votre PC, copier le projet
scp -i ~/.ssh/martynx -r ./Logawa martynx@192.168.0.19:~/
```

### 2. Configurer le démarrage automatique

Connectez-vous à votre Raspberry Pi et exécutez :

```bash
ssh martynx@192.168.0.19
cd ~/Logawa
chmod +x scripts/setup-raspberry-auto-start.sh
./scripts/setup-raspberry-auto-start.sh
```

Ce script va :
- ✅ Installer Docker automatiquement
- ✅ Configurer le démarrage automatique
- ✅ Créer un service systemd
- ✅ Créer un script de mise à jour

### 3. Configurer les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos vraies valeurs
nano .env
```

### 4. Démarrer le bot

```bash
# Démarrer manuellement la première fois
docker-compose -f docker-compose.raspberry.yml up -d

# Vérifier que ça fonctionne
docker-compose -f docker-compose.raspberry.yml ps
```

## 🔄 Déploiement Automatique

### Option 1 : Script PowerShell (Recommandé)

Depuis votre PC, utilisez le script de déploiement :

```powershell
# Dans le dossier du projet
.\scripts\deploy-to-raspberry.ps1
```

Ce script va :
- 📁 Copier tous les fichiers modifiés
- 🔧 Reconstruire l'image Docker
- 🚀 Redémarrer le conteneur
- ✅ Vérifier le statut

### Option 2 : Déploiement manuel

```bash
# 1. Copier les fichiers
scp -i ~/.ssh/martynx -r ./Logawa martynx@192.168.0.19:~/

# 2. Se connecter et redémarrer
ssh martynx@192.168.0.19
cd ~/Logawa
./update-liko-bot.sh
```

## 🎛️ Gestion du Bot

### Commandes utiles sur la Raspberry Pi

```bash
# Voir le statut du service
sudo systemctl status liko-bot

# Démarrer le bot
sudo systemctl start liko-bot

# Arrêter le bot
sudo systemctl stop liko-bot

# Redémarrer le bot
sudo systemctl restart liko-bot

# Voir les logs en temps réel
docker-compose -f ~/Logawa/docker-compose.raspberry.yml logs -f

# Mettre à jour manuellement
~/update-liko-bot.sh
```

### Commandes utiles depuis votre PC

```powershell
# Déployer automatiquement
.\scripts\deploy-to-raspberry.ps1

# Voir les logs
ssh -i ~/.ssh/martynx martynx@192.168.0.19 "cd ~/Logawa && docker-compose -f docker-compose.raspberry.yml logs -f"

# Vérifier le statut
ssh -i ~/.ssh/martynx martynx@192.168.0.19 "cd ~/Logawa && docker-compose -f docker-compose.raspberry.yml ps"
```

## 🔧 Configuration Avancée

### Modifier l'IP de la Raspberry Pi

Si l'IP change, modifiez le script PowerShell :

```powershell
# Éditer scripts/deploy-to-raspberry.ps1
param(
    [string]$RaspberryIP = "192.168.0.19",  # Changez ici
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)
```

### Optimisations pour Raspberry Pi

Le `docker-compose.raspberry.yml` inclut déjà :
- 🧠 Limitation mémoire à 512MB
- 🔄 Redémarrage automatique
- 🏥 Health checks
- 📊 Monitoring des ressources

### Sauvegarde automatique

Les logs et sauvegardes sont persistants grâce aux volumes Docker :
- `./logs:/app/logs` - Logs de l'application
- `./backups:/app/backups` - Sauvegardes

## 🐛 Dépannage

### Le bot ne démarre pas

```bash
# Vérifier les logs du service
sudo journalctl -u liko-bot -f

# Vérifier les logs Docker
docker-compose -f ~/Logawa/docker-compose.raspberry.yml logs

# Vérifier les permissions
ls -la ~/Logawa/.env
```

### Problème de permissions Docker

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session SSH
exit
ssh martynx@192.168.0.19
```

### Problème de mémoire

```bash
# Vérifier l'utilisation mémoire
free -h

# Nettoyer les images Docker inutilisées
docker system prune -f
```

## 📊 Monitoring

### Voir les statistiques du conteneur

```bash
docker stats liko-discord-bot
```

### Vérifier l'utilisation des ressources

```bash
# CPU et mémoire
htop

# Espace disque
df -h

# Logs système
sudo journalctl -f
```

## 🎉 Résultat

Une fois configuré, votre bot :
- ✅ Démarre automatiquement au boot de la Raspberry Pi
- ✅ Se redémarre automatiquement en cas de problème
- ✅ Se met à jour facilement depuis votre PC
- ✅ Conserve ses logs et données
- ✅ Utilise les ressources de manière optimisée

Votre bot Discord sera maintenant opérationnel 24/7 sur votre Raspberry Pi ! 🚀 