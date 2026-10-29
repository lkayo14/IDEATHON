# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências do workspace
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm install

# Copia código fonte
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/

# Gera o client do Prisma e compila o código
RUN npm --prefix backend run prisma:generate
RUN npm --prefix backend run build
RUN npm --prefix frontend run build

# Imagem de produção enxuta
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Cria diretório de uploads com permissões
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

COPY package.json ./
COPY backend/package.json ./backend/

# Instala apenas dependências de produção
RUN npm install --omit=dev --workspace=backend

# Copia compilações
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["sh", "-c", "npx --prefix backend prisma db push && node backend/dist/server.js"]
