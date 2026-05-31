FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod

COPY . .

RUN pnpm build

EXPOSE 3001

CMD ["node", "dist/main.js"]
