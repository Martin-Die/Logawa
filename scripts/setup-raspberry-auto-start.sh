#!/bin/bash

# Script de configuration du démarrage automatique sur Raspberry Pi
# À exécuter sur la Raspberry Pi

echo "🔧 Configuration du démarrage automatique..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installation en cours..."
    
    # Installer Docker selon la documentation officielle
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Ajouter la clé GPG officielle de Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    
    # Ajouter le dépôt Docker
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Ajouter l'utilisateur au groupe docker
    sudo usermod -aG docker $USER
    
    # Démarrer et activer Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo "✅ Docker installé avec succès"
    echo "⚠️  Vous devez vous déconnecter et vous reconnecter pour que les permissions prennent effet"
fi

# Vérifier que Docker Compose est disponible (V1 ou V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Créer le service systemd pour le démarrage automatique
echo "📝 Création du service systemd..."

sudo tee /etc/systemd/system/liko-bot.service > /dev/null <<EOF
[Unit]
Description=Liko Discord Bot
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/Logawa
ExecStart=/usr/bin/env $DOCKER_COMPOSE -f docker-compose.raspberry.yml up -d
ExecStop=/usr/bin/env $DOCKER_COMPOSE -f docker-compose.raspberry.yml down
User=$USER
Group=$USER

[Install]
WantedBy=multi-user.target
EOF

# Recharger systemd et activer le service
sudo systemctl daemon-reload
sudo systemctl enable liko-bot.service

echo "✅ Service systemd créé et activé"
echo "🚀 Le bot démarrera automatiquement au boot de la Raspberry Pi"

# Créer un script de mise à jour automatique
echo "📝 Création du script de mise à jour..."

tee ~/update-liko-bot.sh > /dev/null <<EOF
#!/bin/bash

echo "🔄 Mise à jour du bot Liko..."

cd ~/Logawa

# Arrêter le conteneur
$DOCKER_COMPOSE -f docker-compose.raspberry.yml down

# Reconstruire l'image
$DOCKER_COMPOSE -f docker-compose.raspberry.yml build --no-cache

# Redémarrer le conteneur
$DOCKER_COMPOSE -f docker-compose.raspberry.yml up -d

echo "✅ Mise à jour terminée"
$DOCKER_COMPOSE -f docker-compose.raspberry.yml ps
EOF

chmod +x ~/update-liko-bot.sh

echo "✅ Script de mise à jour créé: ~/update-liko-bot.sh"
echo ""
echo "📋 Commandes utiles:"
echo "  - Démarrer le bot: sudo systemctl start liko-bot"
echo "  - Arrêter le bot: sudo systemctl stop liko-bot"
echo "  - Voir les logs: $DOCKER_COMPOSE -f ~/Logawa/docker-compose.raspberry.yml logs -f"
echo "  - Mettre à jour: ~/update-liko-bot.sh"
echo "  - Statut du service: sudo systemctl status liko-bot" 