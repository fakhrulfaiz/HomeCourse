# Backend Dockerfile for local development
FROM node:20-alpine

# Install system dependencies
# - openssl: Required for Prisma on Alpine Linux
# - ffmpeg: Required for video metadata extraction (ffprobe)
RUN apk add --no-cache openssl ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client (will be regenerated on startup due to volume mount)
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Generate Prisma client on startup (needed because node_modules is a volume)
# Then start development server with nodemon
CMD ["sh", "-c", "npx prisma generate && npm run dev"]
