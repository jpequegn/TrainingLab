# Multi-stage Dockerfile for WkoLibrary
# Security-hardened production build

# ================================
# Stage 1: Node.js Dependencies
# ================================
FROM node:20-alpine AS node-deps
WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install Node.js dependencies with security audit
RUN npm ci --only=production && \
    npm audit --audit-level=moderate && \
    npm cache clean --force

# ================================
# Stage 2: Python Dependencies
# ================================
FROM python:3.11-alpine AS python-deps
WORKDIR /app

# Install system dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
        gcc \
        musl-dev \
        libffi-dev \
        openssl-dev \
        && rm -rf /var/cache/apk/*

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip check

# ================================
# Stage 3: Application Build
# ================================
FROM python:3.11-alpine AS app-build
WORKDIR /app

# Install runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
        dumb-init \
        nodejs \
        npm \
        && rm -rf /var/cache/apk/*

# Copy dependencies from previous stages
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin
COPY --from=node-deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Remove development and test files for security
RUN rm -rf \
    tests/ \
    test_* \
    *test* \
    .git/ \
    .github/ \
    docs/ \
    *.md \
    layout_analysis_screenshots/ \
    .env \
    && find . -name "*.pyc" -delete \
    && find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# ================================
# Stage 4: Production Runtime
# ================================
FROM python:3.11-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -s /sbin/nologin -G appgroup appuser

# Install runtime dependencies and security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
        dumb-init \
        nodejs \
        npm \
        curl \
        && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy dependencies and application from build stage
COPY --from=app-build --chown=appuser:appgroup /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=app-build --chown=appuser:appgroup /usr/local/bin /usr/local/bin
COPY --from=node-deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=app-build --chown=appuser:appgroup /app ./

# Set secure file permissions
RUN chown -R appuser:appgroup /app && \
    chmod -R 755 /app && \
    chmod -R 644 /app/*.py /app/*.js /app/*.css /app/*.html /app/*.json 2>/dev/null || true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Security configurations
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    USER=appuser

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["python", "server.py"]