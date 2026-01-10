FROM node:18 AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy packages and apps for workspace installation
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Install dependencies (including workspace links)
RUN npm install

# Build shared library first
WORKDIR /app/packages/shared
RUN npm run generate
RUN npm run build

# Build API
WORKDIR /app/apps/api
RUN npm run build

# --- Production Stage ---
FROM node:18

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Environment defaults (should be overridden)
ENV NODE_ENV=production
ENV PORT=3000

# Create uploads directory
RUN mkdir -p /app/uploads
VOLUME /app/uploads

# Install runtime dependencies for Prisma (Debian)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
