# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production


# Stage 2: Production
FROM node:20-slim

WORKDIR /app

# Copy production files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/docker-startup.sh ./docker-startup.sh

# Make the startup script executable
RUN chmod +x ./docker-startup.sh

# Install curl for health checks and PostgreSQL client for pg_isready
RUN apt-get update && \
    apt-get install -y curl postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Set environment
ENV NODE_ENV=production
ENV PORT=8000
ENV DISABLE_CLUSTERING=true

# Expose port
EXPOSE 8000

# Add health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Start application with migrations
CMD ["./docker-startup.sh"]
