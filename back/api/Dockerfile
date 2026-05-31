FROM node:20-slim

# Instalar Chromium y dependencias necesarias
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-common \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    libasound2 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Definir directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm y dependencias de producción
RUN npm install -g pnpm && pnpm install --prod

# Copiar el resto del código
COPY . .

# Compilar el proyecto NestJS
RUN pnpm build

# Exponer el puerto
EXPOSE 3001

# Comando de inicio
CMD ["node", "dist/main.js"]
