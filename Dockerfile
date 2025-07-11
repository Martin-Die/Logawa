# Utiliser Node.js 18 Alpine comme image de base
FROM node:18-alpine AS base

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --omit=dev && npm cache clean --force

# Étape de build (optionnelle pour les optimisations futures)
FROM base AS build
# Ici vous pourriez ajouter des étapes de build si nécessaire

# Étape de production
FROM base AS production

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Créer le répertoire des logs
RUN mkdir -p /app/logs && chown -R bot:nodejs /app

# Copier le code source
COPY --chown=bot:nodejs . .

# Changer vers l'utilisateur non-root
USER bot

# Exposer le port (si nécessaire pour les webhooks)
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Commande de démarrage
CMD ["npm", "start"] 