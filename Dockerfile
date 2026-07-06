# ── Stage 1: Build Vite/React frontend ───────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN ./node_modules/.bin/vite build


# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY server/ ./server/
COPY shared/ ./shared/
COPY db/ ./db/
COPY scripts/ ./scripts/
COPY --from=build /app/dist ./dist

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

WORKDIR /app

EXPOSE 8080

ENV SERVER_PORT=8080

CMD ["node", "server/index.js"]
