# Guide de déploiement LIKO sur Raspberry Pi

Ce guide vous explique comment déployer votre bot Discord LIKO sur une Raspberry Pi pour qu'il fonctionne 24/7.

## 🍓 Prérequis

- Raspberry Pi 3 ou 4 (recommandé)
- Carte SD 16GB+ avec Raspberry Pi OS
- Connexion internet stable
- Alimentation stable (alimentation officielle recommandée)

## 🔧 Installation de Docker

### Étape 1 : Mettre à jour le système
```bash
sudo apt update && sudo apt upgrade -y
```

### Étape 2 : Installer Docker
```bash
# Installer les dépendances
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG Docker
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le repository Docker
echo "deb [arch=arm64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Ajouter l'utilisateur pi au groupe docker
sudo usermod -aG docker $USER

# Démarrer Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### Étape 3 : Installer Docker Compose
```bash
# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 📁 Préparation du projet

### Étape 1 : Cloner le projet
```bash
# Créer un répertoire pour le projet
mkdir -p ~/liko-bot
cd ~/liko-bot

# Cloner votre repository (remplacez par votre URL)
git clone https://github.com/votre-username/liko-bot.git .
```

### Étape 2 : Créer le fichier .env
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer avec vos vraies valeurs
nano .env
```

Contenu du fichier `.env` :
```bash
DISCORD_TOKEN=votre_token_discord_ici
GUILD_ID=votre_id_serveur_ici
LOG_CHANNEL_ID=votre_id_canal_logs_ici
IGNORED_CHANNELS=channel_id_1,channel_id_2
LOG_LEVEL=info
NODE_ENV=production
```

### Étape 3 : Créer les répertoires
```bash
mkdir -p logs backups
```

## 🐳 Configuration Docker pour Raspberry Pi

### Dockerfile optimisé pour ARM
```dockerfile
# Utiliser Node.js 18 Alpine pour ARM
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev

# Copier le code source
COPY . .

# Créer le répertoire des logs
RUN mkdir -p /app/logs

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Commande de démarrage
CMD ["npm", "start"]
```

### Docker Compose pour Raspberry Pi
```yaml
version: '3.8'

services:
  liko-bot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: liko-discord-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - GUILD_ID=${GUILD_ID}
      - LOG_CHANNEL_ID=${LOG_CHANNEL_ID}
      - IGNORED_CHANNELS=${IGNORED_CHANNELS:-}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      # Montage des logs pour persistance
      - ./logs:/app/logs
      # Montage optionnel pour les sauvegardes
      - ./backups:/app/backups
    ports:
      # Port pour les webhooks externes (optionnel)
      - "3000:3000"
    networks:
      - liko-network
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('Health check passed')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  liko-network:
    driver: bridge
```

## 🚀 Déploiement

### Étape 1 : Construire et démarrer
```bash
# Construire l'image
docker-compose build

# Démarrer le conteneur
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

### Étape 2 : Vérifier le statut
```bash
# Vérifier que le conteneur fonctionne
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f liko-bot
```

## 🔧 Gestion quotidienne

### Commandes utiles
```bash
# Voir les logs
docker-compose logs -f liko-bot

# Redémarrer le service
docker-compose restart liko-bot

# Arrêter le service
docker-compose stop liko-bot

# Mettre à jour le code
git pull
docker-compose up -d --build

# Voir l'utilisation des ressources
docker stats liko-discord-bot
```

### Surveillance automatique
```bash
# Créer un script de surveillance
nano ~/monitor-bot.sh
```

Contenu du script :
```bash
#!/bin/bash
if ! docker-compose ps | grep -q "Up"; then
    echo "Bot is down, restarting..."
    docker-compose up -d
    echo "Bot restarted at $(date)" >> ~/bot-restarts.log
fi
```

```bash
# Rendre le script exécutable
chmod +x ~/monitor-bot.sh

# Ajouter au cron pour vérifier toutes les 5 minutes
crontab -e
# Ajouter cette ligne :
# */5 * * * * /home/pi/monitor-bot.sh
```

## 🌐 Accès distant (Optionnel)

### Configuration SSH
```bash
# Activer SSH
sudo raspi-config
# Interface Options > SSH > Enable

# Changer le mot de passe par défaut
passwd
```

### Accès aux logs via web (Optionnel)
```bash
# Installer un serveur web simple
sudo apt install -y nginx

# Configurer nginx pour servir les logs
sudo nano /etc/nginx/sites-available/liko-logs
```

Configuration nginx :
```nginx
server {
    listen 80;
    server_name votre-ip-raspberry;

    location /logs {
        alias /home/pi/liko-bot/logs;
        autoindex on;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/liko-logs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Sécurité

### Pare-feu
```bash
# Installer ufw
sudo apt install -y ufw

# Configurer le pare-feu
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000
sudo ufw enable
```

### Mise à jour automatique
```bash
# Créer un script de mise à jour
nano ~/update-system.sh
```

```bash
#!/bin/bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

```bash
# Ajouter au cron (tous les dimanches à 2h du matin)
# 0 2 * * 0 /home/pi/update-system.sh
```

## 📊 Surveillance

### Endpoints de santé
- `http://votre-ip-raspberry:3000/health`
- `http://votre-ip-raspberry:3000/status`
- `http://votre-ip-raspberry:3000/ping`

### Logs importants
```bash
# Logs du bot
tail -f ~/liko-bot/logs/app.log

# Logs Docker
docker-compose logs -f

# Logs système
journalctl -u docker.service -f
```

## 🎉 Félicitations !

Votre bot LIKO fonctionne maintenant 24/7 sur votre Raspberry Pi !

### Avantages de cette solution
- ✅ Contrôle total
- ✅ Pas de coûts mensuels
- ✅ Données locales
- ✅ Personnalisable
- ✅ Écologique (faible consommation)

### Maintenance recommandée
- Vérifiez les logs quotidiennement
- Mettez à jour le système hebdomadairement
- Sauvegardez les logs régulièrement
- Surveillez l'espace disque 