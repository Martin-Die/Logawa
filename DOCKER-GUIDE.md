# Guide Docker pour LIKO Discord Bot

Ce guide vous explique comment déployer le bot Discord LIKO en utilisant Docker.

## Prérequis

- Docker installé sur votre système
- Docker Compose installé
- Un token Discord Bot valide
- Les IDs de votre serveur Discord et canal de logs

## Configuration

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet avec vos informations :

```bash
# Copiez le fichier d'exemple
cp env.example .env

# Éditez le fichier .env avec vos vraies valeurs
DISCORD_TOKEN=votre_token_discord_ici
GUILD_ID=votre_id_serveur_ici
LOG_CHANNEL_ID=votre_id_canal_logs_ici
IGNORED_CHANNELS=channel_id_1,channel_id_2
LOG_LEVEL=info
WEBHOOK_URL=votre_webhook_url_ici
```

### 2. Création des répertoires

```bash
# Créez les répertoires pour les logs et sauvegardes
mkdir -p logs backups
```

## Déploiement

### Option 1 : Avec Docker Compose (Recommandé)

```bash
# Construire et démarrer le conteneur
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Arrêter le conteneur
docker-compose down
```

### Option 2 : Avec Docker directement

```bash
# Construire l'image
docker build -t liko-bot .

# Démarrer le conteneur
docker run -d \
  --name liko-discord-bot \
  --restart unless-stopped \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/backups:/app/backups \
  -p 3000:3000 \
  liko-bot
```

## Commandes utiles

### Gestion du conteneur

```bash
# Voir les logs
docker-compose logs -f liko-bot

# Redémarrer le service
docker-compose restart liko-bot

# Arrêter le service
docker-compose stop liko-bot

# Supprimer le conteneur et l'image
docker-compose down --rmi all
```

### Maintenance

```bash
# Mettre à jour l'image
docker-compose pull
docker-compose up -d --build

# Nettoyer les images non utilisées
docker image prune -f

# Voir l'utilisation des ressources
docker stats liko-discord-bot
```

## Structure des volumes

```
./logs/          # Logs de l'application
./backups/       # Sauvegardes automatiques
./.env           # Variables d'environnement
```

## Sécurité

- Le conteneur s'exécute avec un utilisateur non-root
- Les variables sensibles sont gérées via des variables d'environnement
- Le port 3000 est exposé uniquement si nécessaire pour les webhooks

## Dépannage

### Problèmes courants

1. **Le bot ne démarre pas**
   ```bash
   # Vérifiez les logs
   docker-compose logs liko-bot
   
   # Vérifiez les variables d'environnement
   docker-compose config
   ```

2. **Problèmes de permissions**
   ```bash
   # Vérifiez les permissions des volumes
   ls -la logs/ backups/
   
   # Corrigez si nécessaire
   sudo chown -R $USER:$USER logs/ backups/
   ```

3. **Le bot ne se connecte pas à Discord**
   - Vérifiez que le token Discord est correct
   - Assurez-vous que le bot a les bonnes permissions
   - Vérifiez que les IDs de serveur et canal sont corrects

### Logs détaillés

```bash
# Activer les logs de debug
export LOG_LEVEL=debug
docker-compose up -d

# Voir tous les logs
docker-compose logs -f --tail=100
```

## Production

Pour un déploiement en production :

1. Utilisez un reverse proxy (nginx, traefik)
2. Configurez des sauvegardes automatiques
3. Surveillez les ressources avec des outils comme Prometheus
4. Utilisez des secrets Docker pour les variables sensibles

## Exemple avec Traefik

```yaml
# Ajoutez ces labels au service dans docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.liko.rule=Host(`bot.votre-domaine.com`)"
  - "traefik.http.services.liko.loadbalancer.server.port=3000"
```

## Support

Pour toute question ou problème, consultez :
- Les logs Docker : `docker-compose logs -f`
- La documentation Discord.js
- Les issues GitHub du projet 