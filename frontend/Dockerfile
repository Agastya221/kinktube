# =============================================================================
# KinkTube Frontend - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for node-gyp
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install locked dependencies when a lockfile is present.
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AD_NETWORK
ARG NEXT_PUBLIC_AD_ZONE_BANNER
ARG NEXT_PUBLIC_AD_ZONE_SIDEBAR
ARG NEXT_PUBLIC_AD_ZONE_NATIVE
ARG NEXT_PUBLIC_AD_ZONE_POPUNDER
ARG NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER
ARG NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER
ARG NEXT_PUBLIC_GA_ID

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_AD_NETWORK=${NEXT_PUBLIC_AD_NETWORK}
ENV NEXT_PUBLIC_AD_ZONE_BANNER=${NEXT_PUBLIC_AD_ZONE_BANNER}
ENV NEXT_PUBLIC_AD_ZONE_SIDEBAR=${NEXT_PUBLIC_AD_ZONE_SIDEBAR}
ENV NEXT_PUBLIC_AD_ZONE_NATIVE=${NEXT_PUBLIC_AD_ZONE_NATIVE}
ENV NEXT_PUBLIC_AD_ZONE_POPUNDER=${NEXT_PUBLIC_AD_ZONE_POPUNDER}
ENV NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER=${NEXT_PUBLIC_AD_ZONE_VIDEO_BANNER}
ENV NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER=${NEXT_PUBLIC_AD_ZONE_MOBILE_BANNER}
ENV NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID}

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets. Keep public writable so an external cron can refresh
# public/sitemaps with scripts/generate-sitemaps.mjs if this image is used
# as the sitemap generation runtime.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set host and port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["node", "server.js"]
