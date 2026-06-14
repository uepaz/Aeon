# Multi-stage build for production deployment
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install system dependencies with retry mechanism
RUN apk update && \
    apk add --no-cache \
    libc6-compat \
    bash \
    curl \
    postgresql-client

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install runtime dependencies with retry mechanism
RUN apk update && \
    apk add --no-cache \
    bash \
    curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy migration files and scripts
COPY --from=builder /app/supabase ./supabase
COPY --from=builder /app/scripts ./scripts

# Make entrypoint script executable
RUN chmod +x /app/scripts/entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script for auto-migration
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
