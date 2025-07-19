# Configuration des Canaux de Logs Séparés

Ce guide explique comment configurer des canaux Discord séparés pour différents types de logs du bot LOGAWA.

## Canaux Disponibles

Le bot peut maintenant envoyer les logs vers 4 canaux différents :

1. **📊 Canal de Statut** (`STATUS_LOG_CHANNEL_ID`)
   - Démarrage/arrêt du bot
   - Erreurs et avertissements
   - Événements de serveur (création/suppression de rôles, canaux, etc.)
   - Informations système

2. **💬 Canal des Messages** (`MESSAGES_LOG_CHANNEL_ID`)
   - Messages envoyés
   - Messages modifiés
   - Messages supprimés
   - Réactions ajoutées/supprimées
   - Suppression en masse de messages

3. **🚫 Canal des Mots Interdits** (`FORBIDDEN_WORDS_LOG_CHANNEL_ID`)
   - Détection de mots interdits dans les messages
   - Messages contenant des termes bannis

4. **🛡️ Canal de Modération** (`MODERATION_LOG_CHANNEL_ID`)
   - Kicks et bans
   - Timeouts
   - Changements de rôles
   - Actions de modération

## Configuration

### Variables d'Environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# Canaux de logs séparés
STATUS_LOG_CHANNEL_ID=1234567890123456789
MESSAGES_LOG_CHANNEL_ID=1234567890123456790
FORBIDDEN_WORDS_LOG_CHANNEL_ID=1234567890123456791
MODERATION_LOG_CHANNEL_ID=1234567890123456792

# Configuration des mots interdits (optionnel)
FORBIDDEN_WORDS=mot1,mot2,mot3


```



## Création des Canaux

1. **Canal de Statut** : Créez un canal texte nommé `📊-logs-statut`
2. **Canal des Messages** : Créez un canal texte nommé `💬-logs-messages`
3. **Canal des Mots Interdits** : Créez un canal texte nommé `🚫-logs-mots-interdits`
4. **Canal de Modération** : Créez un canal texte nommé `🛡️-logs-moderation`

### Permissions Requises

Assurez-vous que le bot a les permissions suivantes sur chaque canal :
- `Voir le canal`
- `Envoyer des messages`
- `Lire l'historique des messages`

## Configuration des Mots Interdits

Les mots interdits sont maintenant gérés via un fichier texte `forbidden_words.txt` à la racine du projet.

### Format du Fichier

```txt
insulte
imbécile
idiot
stupide
spam
pub
publicité
mot1
mot2
mot3
```

**Format simple :** Un mot par ligne, sans commentaires ni en-têtes.

### Modification de la Liste

La liste des mots interdits se modifie en éditant directement le fichier `forbidden_words.txt` avec n'importe quel éditeur de texte.

**Format :** Un mot par ligne, sans commentaires ni formatage spécial.

**Rechargement :** La liste est automatiquement rechargée au démarrage du bot.

## Exemples d'Utilisation

### Configuration Complète
```env
STATUS_LOG_CHANNEL_ID=1234567890123456789
MESSAGES_LOG_CHANNEL_ID=1234567890123456790
FORBIDDEN_WORDS_LOG_CHANNEL_ID=1234567890123456791
MODERATION_LOG_CHANNEL_ID=1234567890123456792
```

**Note :** Les mots interdits sont maintenant gérés via le fichier `forbidden_words.txt`

### Configuration Minimale
```env
STATUS_LOG_CHANNEL_ID=1234567890123456789
MESSAGES_LOG_CHANNEL_ID=1234567890123456789
```

## Fonctionnalités

### Détection Automatique des Mots Interdits
- Le bot scanne automatiquement tous les nouveaux messages
- Les messages contenant des mots interdits sont loggés dans le canal dédié
- La détection est insensible à la casse

### Fallback Intelligent
- Si un canal spécifique n'est pas configuré, le bot utilise le canal de messages
- Si aucun canal n'est configuré, le bot affiche une erreur et ne démarre pas

### Logs Détaillés
Chaque type de log contient des informations spécifiques :
- **Statut** : Informations système, erreurs, événements serveur
- **Messages** : Contenu des messages, auteurs, timestamps
- **Mots Interdits** : Mot détecté, contenu du message, auteur
- **Modération** : Actions effectuées, modérateur, raison, durée

## Dépannage

### Problèmes Courants

1. **Aucun log n'apparaît**
   - Vérifiez que les IDs des canaux sont corrects
   - Assurez-vous que le bot a les permissions nécessaires

2. **Logs mélangés dans un seul canal**
   - Vérifiez que tous les canaux sont configurés correctement
   - Le bot utilise le canal de fallback si un canal spécifique n'est pas trouvé

3. **Mots interdits non détectés**
   - Vérifiez le fichier `forbidden_words.txt`
   - Assurez-vous que les mots sont sur des lignes séparées
   - Le fichier ne doit contenir que des mots, sans commentaires
   - Redémarrez le bot après modification du fichier

### Logs de Debug

Le bot enregistre des informations de debug dans les logs de console :
```
[INFO] Log channel 'status' initialized successfully
[INFO] Log channel 'messages' initialized successfully
[INFO] Discord logger initialized successfully with 4 channels
```

## Migration depuis l'Ancienne Version

Si vous utilisez déjà le bot avec l'ancien système :

1. Remplacez `LOG_CHANNEL_ID` par les 4 nouveaux canaux
2. Créez les nouveaux canaux Discord
3. Redémarrez le bot
4. Les logs seront automatiquement séparés selon leur type

**Note :** L'ancienne variable `LOG_CHANNEL_ID` n'est plus supportée. 