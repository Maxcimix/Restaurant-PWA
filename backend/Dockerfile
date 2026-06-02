# ── Backend Dockerfile ──────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para pg
RUN apk add --no-cache python3 make g++

# Copiar package files e instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Exponer puerto
EXPOSE 3001

# Iniciar con el JS compilado
CMD ["node", "dist/server.js"]
