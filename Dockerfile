# ================================================================
# Dockerfile for Medusa v2 - Ironclad Standard (npm)
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
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Medusa v2 dependency tree requires legacy peer dependency resolution.
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build step moved to start.sh for better error visibility
# RUN yarn build

# Ensure start script is executable
RUN chmod +x start.sh

# Expose Medusa port
EXPOSE 9000

# Start script handles DB wait and Medusa develop
CMD ["./start.sh"]
