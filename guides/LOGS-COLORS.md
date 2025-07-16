# Color Guide - Logawa Bot

This guide presents all Logawa bot detections with their colors, organized by log type.

## 📝 Messages (`messages/`)

| Detection | Color | Hex Code |
|-----------|-------|----------|
| **Message sent** | 🟢 Green | `#00ff00` |
| **Message edited** | 🔵 Blue | `#4169e1` |
| **Reaction added** | 🟢 Green | `#00ff00` |
| **Reaction removed** | 🟠 Orange | `#ffa500` |

## ⚖️ Moderation (`moderation/`)

| Detection | Color | Hex Code |
|-----------|-------|----------|
| **Message deleted** | 🔴 Red | `#ff0000` |
| **Bulk messages deleted** | 🔴 Red | `#ff0000` |
| **Member joined** | 🟢 Green | `#00ff00` |
| **Member left** | 🟠 Orange | `#ffa500` |
| **Member kicked** | 🟠 Orange | `#ffa500` |
| **Member banned** | 🔴 Red | `#ff0000` |
| **Member unbanned** | 🟢 Green | `#00ff00` |
| **Timeout added** | 🟡 Yellow | `#ffff00` |
| **Timeout removed** | 🟡 Yellow | `#ffff00` |
| **Roles added** | 🟢 Green | `#00ff00` |
| **Roles removed** | 🟠 Orange | `#ffa500` |
| **Channel created** | 🟢 Green | `#00ff00` |
| **Channel deleted** | 🔴 Red | `#ff0000` |
| **Channel modified** | 🔵 Blue | `#0099ff` |
| **Role created** | 🟢 Green | `#00ff00` |
| **Role deleted** | 🔴 Red | `#ff0000` |
| **Role modified** | 🟡 Yellow | `#ffff00` |
| **Emoji created** | 🟢 Green | `#00ff00` |
| **Emoji deleted** | 🔴 Red | `#ff0000` |
| **Invite created** | 🟢 Green | `#00ff00` |
| **Invite deleted** | 🔴 Red | `#ff0000` |

## 🚫 Forbidden Words (`forbiddenWords/`)

| Detection | Color | Hex Code |
|-----------|-------|----------|
| **Forbidden word detected** | 🔴 Red | `#ff0000` |

## ⚙️ Status (`status/`)

| Detection | Color | Hex Code |
|-----------|-------|----------|
| **Bot started** | 🟢 Green | `#00ff00` |
| **Bot stopped** | 🔴 Red | `#ff0000` |
| **Bot error** | 🔴 Red | `#ff0000` |
| **Bot warning** | 🟡 Yellow | `#ffff00` |
| **Bot info** | 🔵 Blue | `#0099ff` |

## 🌐 External Webhook

| Level | Color | Hex Code |
|-------|-------|----------|
| **Error** | 🔴 Red | `#ff0000` |
| **Warn** | 🟡 Yellow | `#ffff00` |
| **Info** | 🟢 Green | `#00ff00` |
| **Debug** | 🔵 Blue | `#0099ff` |

## 📊 Auto Backup

| Detection | Color | Hex Code |
|-----------|-------|----------|
| **Backup successful** | 🟢 Green | `#00ff00` |
| **Backup error** | 🔴 Red | `#ff0000` |

---

### Color Legend

- 🟢 **Green** (`#00ff00`) : Positive actions, creations, success
- 🔴 **Red** (`#ff0000`) : Deletions, errors, critical actions
- 🟠 **Orange** (`#ffa500`) : Neutral actions, departures, kicks
- 🟡 **Yellow** (`#ffff00`) : Modifications, timeouts, warnings
- 🔵 **Blue** (`#4169e1` / `#0099ff`) : Information, modifications, status

*Logawa Color Guide - January 2025* 