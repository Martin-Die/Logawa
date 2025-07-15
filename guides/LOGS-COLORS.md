# Guide des Couleurs - Logawa Bot

Ce guide documente la palette de couleurs utilisée dans les logs Discord du bot Logawa, optimisée pour l'accessibilité des utilisateurs daltoniens.

## 🎨 Palette de Couleurs

| Événement | Couleur | Code Hex | Emoji | Description |
|-----------|---------|----------|-------|-------------|
| **Messages envoyés** | 🟢 Vert | `#00ff00` | ✅ | Messages normaux sans mots interdits |
| **Messages modifiés** | 🔵 Bleu | `#4169e1` | ✏️ | Messages édités par les utilisateurs |
| **Messages supprimés** | 🔴 Rouge | `#ff0000` | 🗑️ | Messages supprimés individuellement |
| **Suppression en masse** | 🔴 Rouge | `#ff0000` | 🗑️ | Suppression de plusieurs messages |
| **Réactions ajoutées** | 🟢 Vert | `#00ff00` | 👍 | Réactions ajoutées aux messages |
| **Réactions supprimées** | 🟠 Orange | `#ffa500` | 👎 | Réactions retirées des messages |
| **Actions de modération** | 🔴 Rouge | `#ff0000` | ⚖️ | Kicks, bans, timeouts, changements de rôles |
| **Mots interdits** | 🔴 Rouge | `#ff0000` | 🚫 | Détection de contenu interdit |
| **Événements serveur** | 🟡 Jaune | `#ffff00` | ⚙️ | Création/suppression de canaux, rôles, emojis |

## 🔍 Détail par Type d'Événement

### 📝 Messages (`messages/`)
- **🟢 Vert** : Messages envoyés, réactions ajoutées
- **🔵 Bleu** : Messages modifiés
- **🟠 Orange** : Réactions supprimées

### ⚖️ Modération (`moderation/`)
- **🔴 Rouge** : Toutes les actions de modération
  - Kicks de membres
  - Bans/Unbans
  - Timeouts (ajout/suppression)
  - Changements de rôles
  - Suppressions de messages

### 🚫 Mots Interdits (`forbiddenWords/`)
- **🔴 Rouge** : Détection de mots interdits dans les messages

### ⚙️ Statut (`status/`)
- **🟡 Jaune** : Événements de configuration du serveur
  - Création/suppression de canaux
  - Création/suppression de rôles
  - Création/suppression d'emojis
  - Création/suppression d'invitations

### ❌ Erreurs (`errors/`)
- **🔴 Rouge** : Toutes les erreurs système

## ♿ Accessibilité

### Choix des Couleurs
Les couleurs ont été sélectionnées pour être **accessibles aux utilisateurs daltoniens** :

- **Vert** (`#00ff00`) : Facilement distinguable
- **Bleu** (`#4169e1`) : Alternative au jaune pour les modifications
- **Rouge** (`#ff0000`) : Très distinct pour les actions importantes
- **Orange** (`#ffa500`) : Bon contraste pour les suppressions
- **Jaune** (`#ffff00`) : Utilisé uniquement pour les événements de statut

### Recommandations
- ✅ **Bleu** pour les modifications (plus accessible que le jaune)
- ✅ **Orange** pour les suppressions de réactions
- ✅ **Rouge** pour les actions critiques (modération, erreurs)
- ✅ **Vert** pour les actions positives (messages, réactions)

## 🎯 Logique des Couleurs

### Actions Positives → Vert
- Messages envoyés
- Réactions ajoutées

### Actions de Modification → Bleu
- Messages modifiés

### Actions de Suppression → Orange/Rouge
- **Orange** : Suppressions mineures (réactions)
- **Rouge** : Suppressions majeures (messages, modération)

### Actions Critiques → Rouge
- Modération (kicks, bans, timeouts)
- Mots interdits
- Erreurs système

### Configuration → Jaune
- Événements de statut du serveur

## 🔧 Personnalisation

### Changer les Couleurs
Pour modifier les couleurs, éditez les fichiers d'événements :

```javascript
// Dans events/messageEvents.js
const embed = this.discordLogger.createEmbed(
    'Message Edited',
    'Description...',
    0x4169e1,  // ← Code couleur hexadécimal
    fields
);
```

### Codes Couleur Utiles
```javascript
// Couleurs recommandées pour l'accessibilité
const COLORS = {
    GREEN: 0x00ff00,    // Actions positives
    BLUE: 0x4169e1,     // Modifications
    RED: 0xff0000,      // Actions critiques
    ORANGE: 0xffa500,   // Suppressions mineures
    YELLOW: 0xffff00,   // Configuration
    PURPLE: 0x9370db,   // Alternative au jaune
    CYAN: 0x00bfff      // Alternative au vert
};
```

## 📊 Exemples Visuels

### Messages
```
🟢 Message sent: User#1234 in #general
🔵 Message edited: User#1234 in #general
🟠 Reaction removed: User#1234 on message
```

### Modération
```
🔴 Message deleted: User#1234 in #general
🔴 Member kicked: User#1234 by Moderator#5678
🔴 Member banned: User#1234 by Moderator#5678
🔴 Roles added: User#1234 by Moderator#5678
```

### Mots Interdits
```
🔴 Forbidden word detected: User#1234 in #general
```

### Statut
```
🟡 Channel created: #new-channel
🟡 Role deleted: Moderator
🟡 Emoji created: :new_emoji:
```

## 🚨 Bonnes Pratiques

1. **Cohérence** : Utilisez toujours la même couleur pour le même type d'événement
2. **Contraste** : Assurez-vous que les couleurs sont bien distinctes
3. **Accessibilité** : Privilégiez les couleurs accessibles aux daltoniens
4. **Logique** : Les couleurs doivent avoir un sens intuitif

---

*Guide créé pour optimiser l'accessibilité des logs Logawa - Janvier 2025* 