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
    curl

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
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STORAGE_TYPE
ARG NEXT_PUBLIC_MINIO_ENDPOINT
ARG NEXT_PUBLIC_MINIO_PORT
ARG NEXT_PUBLIC_MINIO_USE_SSL
ARG NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT
ARG NEXT_PUBLIC_MINIO_PUBLIC_PORT
ARG NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL
ARG NEXT_PUBLIC_MINIO_BUCKET
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STORAGE_TYPE=$NEXT_PUBLIC_STORAGE_TYPE
ENV NEXT_PUBLIC_MINIO_ENDPOINT=$NEXT_PUBLIC_MINIO_ENDPOINT
ENV NEXT_PUBLIC_MINIO_PORT=$NEXT_PUBLIC_MINIO_PORT
ENV NEXT_PUBLIC_MINIO_USE_SSL=$NEXT_PUBLIC_MINIO_USE_SSL
ENV NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT=$NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT
ENV NEXT_PUBLIC_MINIO_PUBLIC_PORT=$NEXT_PUBLIC_MINIO_PUBLIC_PORT
ENV NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL=$NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL
ENV NEXT_PUBLIC_MINIO_BUCKET=$NEXT_PUBLIC_MINIO_BUCKET

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
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules

# Copy runtime scripts
COPY --from=builder /app/scripts ./scripts

# Make entrypoint script executable
RUN chmod +x /app/scripts/entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script for app startup
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
