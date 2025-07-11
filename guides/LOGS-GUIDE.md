# 📝 Guide des Logs TXT - Logawa Bot

## 📁 **Structure des Fichiers de Logs**

Le bot Logawa crée automatiquement plusieurs types de fichiers de logs en format TXT :

```
logs/
├── all.log              # Tous les logs (tous niveaux)
├── error.log            # Logs d'erreurs uniquement
├── 2024-01-15.log       # Logs du jour (format YYYY-MM-DD)
├── 2024-01-14.log       # Logs du jour précédent
├── 2024-01-13.log       # etc...
└── archive/             # Anciens logs archivés
```

---

## 🗂️ **Types de Fichiers de Logs**

### **1. `all.log`**
- **Contenu** : Tous les logs (info, warn, error, debug)
- **Rotation** : 10MB max, garde 7 fichiers
- **Format** : `[2024-01-15 14:30:25] [INFO] Bot started successfully`

### **2. `error.log`**
- **Contenu** : Uniquement les erreurs
- **Rotation** : 10MB max, garde 7 fichiers
- **Format** : `[2024-01-15 14:30:25] [ERROR] Failed to send log to Discord`

### **3. `YYYY-MM-DD.log`**
- **Contenu** : Logs du jour spécifique
- **Rotation** : 10MB max, garde 30 jours
- **Format** : `[2024-01-15 14:30:25] [INFO] Message logged: User#1234 sent a message`

---

## 📋 **Contenu des Logs**

### **Messages Discord**
```
[2024-01-15 14:30:25] [INFO] Message logged: User#1234 sent a message in #general
[2024-01-15 14:30:25] [INFO] Message content: "Hello everyone!"
[2024-01-15 14:30:25] [INFO] Message ID: 1234567890123456789
[2024-01-15 14:30:25] [INFO] Channel: #general (ID: 9876543210987654321)
```

### **Actions de Modération**
```
[2024-01-15 14:30:25] [INFO] Moderation action: User#1234 was kicked by Moderator#5678
[2024-01-15 14:30:25] [INFO] Reason: Spam in chat
[2024-01-15 14:30:25] [INFO] User ID: 1234567890123456789
[2024-01-15 14:30:25] [INFO] Moderator ID: 9876543210987654321
```

### **Événements Serveur**
```
[2024-01-15 14:30:25] [INFO] Member joined: User#1234 joined the server
[2024-01-15 14:30:25] [INFO] Member left: User#5678 left the server
[2024-01-15 14:30:25] [INFO] Channel created: #new-channel by User#1234
[2024-01-15 14:30:25] [INFO] Channel deleted: #old-channel by User#5678
```

### **Erreurs et Warnings**
```
[2024-01-15 14:30:25] [ERROR] Failed to send log to Discord channel
[2024-01-15 14:30:25] [ERROR] Error details: Channel not found
[2024-01-15 14:30:25] [WARN] Bot permissions insufficient for channel #logs
```

---

## 🔧 **Configuration des Logs**

### **Variables d'Environnement**
```env
# Niveau de log (debug, info, warn, error)
LOG_LEVEL=info

# Répertoire des logs (par défaut: ./logs)
LOG_DIRECTORY=./logs

# Taille max des fichiers (par défaut: 10MB)
LOG_MAX_SIZE=10m

# Nombre de fichiers à garder (par défaut: 7)
LOG_MAX_FILES=7
```

### **Configuration Avancée**
```javascript
// Dans config.js
logFile: {
    directory: './logs',        // Répertoire des logs
    maxSize: '10m',            // Taille max par fichier
    maxFiles: '7d'             // Garde 7 jours de logs
}
```

---

## 📍 **Où Trouver les Logs**

### **Sur Render (Déploiement Cloud)**
- **Logs en temps réel** : Dashboard Render → Logs
- **Fichiers TXT** : Non accessibles directement (pas de stockage persistant)
- **Logs Discord** : Channel configuré dans votre serveur

### **Sur VPS (Déploiement Local)**
- **Fichiers TXT** : `/home/user/Logawa/logs/`
- **Accès SSH** : `ssh user@your-vps`
- **Commande** : `cd Logawa && ls -la logs/`

### **Sur Railway**
- **Fichiers TXT** : Accessibles via l'interface Railway
- **Logs temps réel** : Dashboard Railway → Logs
- **Téléchargement** : Interface Railway → Files

---

## 📊 **Commandes Utiles pour Analyser les Logs**

### **Voir les Logs en Temps Réel**
```bash
# Tous les logs
tail -f logs/all.log

# Erreurs uniquement
tail -f logs/error.log

# Logs du jour
tail -f logs/$(date +%Y-%m-%d).log
```

### **Rechercher dans les Logs**
```bash
# Chercher un utilisateur
grep "User#1234" logs/all.log

# Chercher les erreurs
grep "ERROR" logs/all.log

# Chercher les actions de modération
grep "Moderation action" logs/all.log

# Chercher les messages d'un canal
grep "#general" logs/all.log
```

### **Statistiques des Logs**
```bash
# Nombre de lignes par jour
wc -l logs/*.log

# Taille des fichiers
du -h logs/*.log

# Dernières 100 lignes
tail -100 logs/all.log
```

---

## 🔄 **Rotation Automatique des Logs**

Le bot utilise Winston pour la rotation automatique :

### **Critères de Rotation**
- **Taille** : 10MB par fichier
- **Temps** : Nouveau fichier par jour
- **Rétention** : 7 jours pour all.log et error.log
- **Rétention** : 30 jours pour les logs quotidiens

### **Exemple de Rotation**
```
logs/
├── all.log              # Fichier actuel
├── all.log.1            # Fichier précédent
├── all.log.2            # Fichier plus ancien
├── error.log            # Erreurs actuelles
├── error.log.1          # Erreurs précédentes
├── 2024-01-15.log       # Aujourd'hui
├── 2024-01-14.log       # Hier
└── 2024-01-13.log       # Avant-hier
```

---

## 📤 **Export et Sauvegarde**

### **Sauvegarde Manuelle**
```bash
# Copier tous les logs
cp -r logs/ backup-logs-$(date +%Y%m%d)/

# Compresser les logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Sauvegarder sur un autre serveur
scp logs-backup-*.tar.gz user@backup-server:/backups/
```

### **Sauvegarde Automatique (VPS)**
```bash
# Créer un script de sauvegarde
nano backup-logs.sh
```

```bash
#!/bin/bash
# Script de sauvegarde automatique
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/logs"
SOURCE_DIR="/home/user/Logawa/logs"

# Créer le répertoire de sauvegarde
mkdir -p $BACKUP_DIR

# Compresser les logs
tar -czf $BACKUP_DIR/logs-$DATE.tar.gz -C $SOURCE_DIR .

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -name "logs-*.tar.gz" -mtime +30 -delete

echo "Backup completed: logs-$DATE.tar.gz"
```

```bash
# Rendre le script exécutable
chmod +x backup-logs.sh

# Ajouter au cron (sauvegarde quotidienne à 2h du matin)
crontab -e
# Ajouter cette ligne :
0 2 * * * /home/user/Logawa/backup-logs.sh
```

---

## 🚨 **Dépannage des Logs**

### **Problèmes Courants**

#### **1. Pas de fichiers de logs**
```bash
# Vérifier les permissions
ls -la logs/

# Vérifier l'espace disque
df -h

# Vérifier les logs du bot
pm2 logs logawa-bot
```

#### **2. Logs incomplets**
```bash
# Vérifier la configuration
cat config.js | grep logFile

# Vérifier les variables d'environnement
echo $LOG_LEVEL
echo $LOG_DIRECTORY
```

#### **3. Fichiers de logs trop gros**
```bash
# Vérifier la taille
du -h logs/*.log

# Forcer la rotation
pm2 restart logawa-bot
```

---

## 📈 **Monitoring des Logs**

### **Script de Monitoring**
```bash
#!/bin/bash
# Script de monitoring des logs
LOG_DIR="/home/user/Logawa/logs"
ALERT_SIZE="100M"

# Vérifier la taille des logs
TOTAL_SIZE=$(du -s $LOG_DIR | cut -f1)

if [ $TOTAL_SIZE -gt $ALERT_SIZE ]; then
    echo "ALERT: Logs directory is getting large: ${TOTAL_SIZE}MB"
    # Envoyer une notification Discord ou email
fi

# Vérifier les erreurs récentes
ERROR_COUNT=$(grep -c "ERROR" $LOG_DIR/all.log | tail -100)

if [ $ERROR_COUNT -gt 10 ]; then
    echo "ALERT: High error count: $ERROR_COUNT errors in last 100 lines"
fi
```

---

## 🎯 **Recommandations**

### **Pour Production**
1. **Sauvegarde quotidienne** des logs
2. **Monitoring** de la taille des logs
3. **Rotation** automatique configurée
4. **Archivage** des anciens logs

### **Pour Développement**
1. **Logs détaillés** (LOG_LEVEL=debug)
2. **Rotation rapide** pour les tests
3. **Nettoyage** régulier des logs

### **Sécurité**
1. **Permissions** restrictives sur le dossier logs
2. **Chiffrement** des logs sensibles
3. **Accès limité** aux fichiers de logs 