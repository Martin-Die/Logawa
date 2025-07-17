# Guide de Dépannage - Déploiement Raspberry Pi

## Problèmes Courants et Solutions

### 1. Le conteneur ne démarre pas

**Symptômes :**
- Le conteneur s'arrête immédiatement après le démarrage
- Erreurs dans les logs Docker

**Solutions :**

#### A. Vérifier les variables d'environnement
```bash
# Sur la Raspberry Pi
cd ~/Logawa
cat .env
```

Assurez-vous que toutes les variables requises sont définies :
- `DISCORD_TOKEN`
- `GUILD_ID`
- `STATUS_LOG_CHANNEL_ID`
- `MESSAGES_LOG_CHANNEL_ID`
- `FORBIDDEN_WORDS_LOG_CHANNEL_ID`
- `MODERATION_LOG_CHANNEL_ID`

#### B. Vérifier les logs du conteneur
```bash
# Voir les logs en temps réel
docker compose -f docker-compose.raspberry.yml logs -f

# Voir les derniers logs
docker compose -f docker-compose.raspberry.yml logs --tail=50
```

#### C. Tester le conteneur en mode interactif
```bash
# Démarrer le conteneur en mode interactif pour debug
docker compose -f docker-compose.raspberry.yml run --rm liko-bot sh
```

### 2. Le conteneur ne se met pas à jour

**Symptômes :**
- Les changements de code ne sont pas pris en compte
- L'ancienne version continue de fonctionner

**Solutions :**

#### A. Forcer la reconstruction sans cache
```bash
# Arrêter le conteneur
docker compose -f docker-compose.raspberry.yml down

# Nettoyer les images
docker system prune -f

# Reconstruire sans cache
docker compose -f docker-compose.raspberry.yml build --no-cache

# Redémarrer
docker compose -f docker-compose.raspberry.yml up -d
```

#### B. Utiliser le script de nettoyage
```powershell
# Depuis votre machine Windows
.\scripts\cleanup-raspberry.ps1
```

### 3. Problèmes de permissions

**Symptômes :**
- Erreurs d'accès aux fichiers
- Problèmes d'écriture des logs

**Solutions :**

#### A. Vérifier les permissions des volumes
```bash
# Sur la Raspberry Pi
ls -la ~/logawa-logs
ls -la ~/logawa-backups

# Corriger les permissions si nécessaire
sudo chown -R martynx:martynx ~/logawa-logs ~/logawa-backups
chmod -R 755 ~/logawa-logs ~/logawa-backups
```

#### B. Vérifier les permissions du conteneur
```bash
# Entrer dans le conteneur
docker exec -it liko-discord-bot sh

# Vérifier les permissions
ls -la /app/logs
ls -la /app/backups
```

### 4. Problèmes de mémoire

**Symptômes :**
- Le conteneur s'arrête sans raison
- Erreurs "Out of memory"

**Solutions :**

#### A. Vérifier l'utilisation mémoire
```bash
# Vérifier la mémoire disponible
free -h

# Vérifier l'utilisation Docker
docker stats
```

#### B. Ajuster les limites mémoire
Modifier `docker-compose.raspberry.yml` :
```yaml
deploy:
  resources:
    limits:
      memory: 256M  # Réduire si nécessaire
    reservations:
      memory: 128M
```

### 5. Problèmes de réseau

**Symptômes :**
- Le bot ne peut pas se connecter à Discord
- Timeouts réseau

**Solutions :**

#### A. Vérifier la connectivité
```bash
# Tester la connexion Internet
ping 8.8.8.8

# Tester la connexion à Discord
curl -I https://discord.com
```

#### B. Vérifier les DNS
```bash
# Vérifier la résolution DNS
nslookup discord.com

# Si problème, utiliser des DNS alternatifs
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
```

### 6. Problèmes d'espace disque

**Symptômes :**
- Erreurs "No space left on device"
- Échec de construction d'image

**Solutions :**

#### A. Vérifier l'espace disque
```bash
# Vérifier l'espace disponible
df -h

# Vérifier l'utilisation Docker
docker system df
```

#### B. Nettoyer l'espace
```bash
# Nettoyer Docker
docker system prune -a -f

# Nettoyer les logs système
sudo journalctl --vacuum-time=7d

# Nettoyer les paquets
sudo apt autoremove -y
sudo apt autoclean
```

## Scripts de Diagnostic

### 1. Diagnostic complet
```powershell
# Depuis votre machine Windows
.\scripts\check-raspberry-status.ps1
```

### 2. Nettoyage et redémarrage
```powershell
# Nettoyer et redémarrer
.\scripts\cleanup-raspberry.ps1
```

### 3. Déploiement complet
```powershell
# Déployer avec toutes les vérifications
.\scripts\deploy-to-raspberry.ps1
```

## Commandes Utiles

### Sur la Raspberry Pi

```bash
# Vérifier l'état des services
sudo systemctl status docker

# Redémarrer Docker si nécessaire
sudo systemctl restart docker

# Voir tous les conteneurs
docker ps -a

# Voir les images
docker images

# Voir les volumes
docker volume ls

# Voir les réseaux
docker network ls

# Nettoyer tout
docker system prune -a -f --volumes
```

### Logs et Debug

```bash
# Logs du conteneur en temps réel
docker compose -f docker-compose.raspberry.yml logs -f

# Logs avec timestamps
docker compose -f docker-compose.raspberry.yml logs -f --timestamps

# Logs des 100 dernières lignes
docker compose -f docker-compose.raspberry.yml logs --tail=100

# Logs d'une date spécifique
docker compose -f docker-compose.raspberry.yml logs --since="2024-01-01T00:00:00"
```

## Vérification Post-Déploiement

Après chaque déploiement, vérifiez :

1. **État du conteneur :**
   ```bash
   docker ps
   ```

2. **Logs du démarrage :**
   ```bash
   docker compose -f docker-compose.raspberry.yml logs --tail=20
   ```

3. **Connectivité Discord :**
   - Vérifier que le bot apparaît en ligne sur Discord
   - Vérifier que les logs sont envoyés dans les canaux configurés

4. **Performance :**
   ```bash
   docker stats liko-discord-bot
   ```

## Contact et Support

Si les problèmes persistent :

1. Collectez les logs complets :
   ```bash
   docker compose -f docker-compose.raspberry.yml logs > logs.txt
   ```

2. Vérifiez la configuration :
   ```bash
   cat .env
   docker compose -f docker-compose.raspberry.yml config
   ```

3. Documentez les étapes de reproduction du problème 