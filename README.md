# LOGAWA Discord Logger Bot

A comprehensive, secure, and reliable Discord bot designed to log all server activities including messages, moderation actions, and server events. The bot provides detailed logging both to files and Discord channels with maximum information capture.

## 🚀 Features

### Message Logging
- **Message Creation**: Logs all new messages with author, channel, content, and timestamp
- **Message Editing**: Tracks message modifications with before/after content
- **Message Deletion**: Records deleted messages with full content
- **Bulk Deletion**: Handles mass message deletions
- **Reactions**: Logs emoji reactions added/removed from messages
- **Smart Filtering**: Ignores bot messages and specified channels

### Moderation Logging
- **Kicks**: Records member kicks with moderator and reason
- **Bans**: Tracks member bans and unbans
- **Timeouts**: Logs timeout applications and removals
- **Role Changes**: Monitors role additions/removals
- **Nickname Changes**: Records nickname modifications
- **Audit Log Integration**: Automatically fetches moderator information

### Server Events
- **Member Join/Leave**: Tracks member arrivals and departures
- **Channel Management**: Logs channel creation, deletion, and updates
- **Role Management**: Monitors role creation, deletion, and modifications
- **Emoji Management**: Tracks emoji additions and removals
- **Invite Management**: Records invite creation and deletion

### Logging Features
- **Dual Logging**: Simultaneous file and Discord channel logging
- **Structured Logs**: Readable text format with timestamps
- **Daily Rotation**: Automatic log file rotation and cleanup
- **Error Handling**: Comprehensive error logging and recovery
- **Rich Embeds**: Beautiful Discord embeds with color coding

## 📋 Requirements

- Node.js 18.0.0 or higher
- Discord Bot Token
- Discord Server (Guild) with appropriate permissions

## 🛠️ Installation

### Option 1: Local Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd LOGAWA
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env file manually
   ```

4. **Configure the bot**
   Create a `.env` file with your Discord bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   GUILD_ID=your_guild_id_here
   LOG_CHANNEL_ID=your_log_channel_id_here
   IGNORED_CHANNELS=channel_id_1,channel_id_2,channel_id_3
   LOG_LEVEL=info
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

### Option 2: Render Deployment (Recommended)

1. **Fork or clone this repository to your GitHub account**

2. **Go to [Render.com](https://render.com) and create an account**

3. **Create a new Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this bot

4. **Configure the service**
   - **Name**: `Logawa-discord-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

5. **Add Environment Variables**
   In the "Environment" section, add these variables:
   ```
   DISCORD_TOKEN=your_bot_token_here
   GUILD_ID=your_guild_id_here
   LOG_CHANNEL_ID=your_log_channel_id_here
   IGNORED_CHANNELS=channel_id_1,channel_id_2,channel_id_3
   LOG_LEVEL=info
   WEBHOOK_URL=your_webhook_url_here (optional)
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your bot
   - The bot will be available at `https://your-app-name.onrender.com`

## 🔧 Bot Setup

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "LOGAWA Logger Bot")
4. Go to "Bot" section and create a bot
5. Copy the bot token

### 2. Configure Bot Permissions
The bot requires the following permissions:
- **View Channels**
- **Read Message History**
- **Send Messages**
- **Manage Messages**
- **View Audit Log**
- **Kick Members**
- **Ban Members**
- **Manage Roles**

### 3. Generate Invite Link
Use this URL template with your bot's client ID:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
```

### 4. Required Intents
Enable these intents in the Discord Developer Portal:
- **Server Members Intent**
- **Message Content Intent**
- **Presence Intent**

## 🚀 Usage

### Local Development
```bash
# Start the bot
npm start
```

### Render Deployment
- The bot will automatically start when deployed
- Check the logs in the Render dashboard
- The bot will restart automatically if it crashes
- No need for external ping services

## 📊 Logging Access

### Render Dashboard
- Go to your service in Render dashboard
- Click on "Logs" tab
- View real-time logs
- Download logs as needed

### Discord Webhook (Optional)
- Create a webhook in your Discord server
- Add the webhook URL to `WEBHOOK_URL` environment variable
- All logs will be sent to the webhook channel

### Health Check
- Visit `https://your-app-name.onrender.com/health`
- Check bot status and uptime

## 📁 File Structure

```
LOGAWA/
├── index.js                 # Main bot file
├── ping.js                  # Health check server
├── config.js               # Configuration management
├── package.json            # Dependencies and scripts
├── render.yaml             # Render deployment config
├── README.md               # This file
├── render-deployment-guide.md # Detailed deployment guide
├── utils/
│   └── logger.js           # Logging utilities
└── events/
    ├── messageEvents.js    # Message-related event handlers
    ├── moderationEvents.js # Moderation event handlers
    └── serverEvents.js     # Server event handlers
```

## 🛡️ Security Features

- **Environment Variables**: Sensitive data stored securely
- **Permission Validation**: Automatic permission checking on startup
- **Error Handling**: Comprehensive error catching and logging
- **Graceful Shutdown**: Proper cleanup on bot termination
- **Audit Log Integration**: Secure moderator identification

## 🔍 Log Examples

### Message Log
```
[2024-01-15 14:30:25] [INFO] Message sent: User#1234 in #general
{
        "messageId": "message_id_example",
      "authorId": "author_id_example",
      "channelId": "channel_id_example",
  "content": "Hello everyone!"
}
```

### Moderation Log
```
[2024-01-15 14:35:10] [INFO] Moderation action: kick on User#1234 by Moderator#5678
{
        "userId": "user_id_example",
      "moderatorId": "moderator_id_example",
  "action": "kick",
  "reason": "Violation of server rules"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Bot not starting**
   - Check if all environment variables are set in Render
   - Verify Discord token is correct
   - Ensure bot has proper permissions

2. **No logs appearing**
   - Check log channel permissions
   - Verify channel ID is correct
   - Check bot's message sending permissions

3. **Missing moderation information**
   - Ensure bot has "View Audit Log" permission
   - Check if audit logs are enabled in server settings

### Render Specific

1. **Service not starting**
   - Check build logs in Render dashboard
   - Verify all dependencies are in package.json
   - Ensure start command is correct

2. **Environment variables not working**
   - Make sure variables are set in Render dashboard
   - Check variable names match exactly
   - Redeploy after changing variables

### Debug Mode
Set `LOG_LEVEL=debug` in your environment variables for detailed debugging information.

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in Render dashboard
3. Ensure all requirements are met
4. Create an issue with detailed information

---

**LOGAWA Logger Bot** - Comprehensive Discord server logging solution 