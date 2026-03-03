# ── Stage 1: build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# API calls go to /api — works regardless of hostname when served by the backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 2: build the backend (compile TS + generate Prisma client) ──────────
FROM node:20-alpine AS backend-builder
RUN apk add --no-cache openssl
WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci
COPY backend/ .
RUN npx prisma generate && npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl ffmpeg
WORKDIR /app

# node_modules from builder contains prisma CLI + client needed at runtime
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist         ./dist
COPY --from=backend-builder /app/backend/prisma       ./prisma

# Frontend static files — served by Express at /
COPY --from=frontend-builder /app/frontend/dist ./public

# SQLite database lives in /data — mount a volume here for persistence
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# Sync schema to DB on every start (safe, idempotent) then run the server
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate && node dist/index.js"]
