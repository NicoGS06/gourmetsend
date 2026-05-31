FROM node:20-slim

WORKDIR /usr/src/app

# Copiar primero package.json y lockfile
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm y dependencias
RUN npm install -g pnpm && pnpm install --prod

# 👇 Forzar descarga de Chromium durante el build
RUN pnpm exec puppeteer browsers install chrome

# Copiar el resto del código
COPY . .

# Compilar
RUN pnpm build

EXPOSE 3001

CMD ["node", "dist/main.js"]
