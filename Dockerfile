# ================================================================
# Dockerfile for Medusa v2 - Ironclad Standard (npm)
# GÜVENLİK: Non-root user + HEALTHCHECK
# ================================================================
FROM node:20-slim

WORKDIR /server

# System dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    netcat-openbsd \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# GÜVENLİK: Non-root kullanıcı oluştur
RUN groupadd -r medusa && useradd -r -g medusa -d /server -s /bin/bash medusa

# Copy package files
COPY package.json package-lock.json ./

# Medusa v2 dependency tree requires legacy peer dependency resolution.
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# start.sh çalıştırılabilir olmalı
RUN chmod +x start.sh

# Dosya sahipliğini medusa kullanıcısına ver
RUN chown -R medusa:medusa /server

# GÜVENLİK: Non-root kullanıcıya geç
USER medusa

# Expose Medusa port
EXPOSE 9000

# HEALTHCHECK: Container sağlık durumu kontrolü
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Start script handles DB wait and Medusa develop
CMD ["./start.sh"]

