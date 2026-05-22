FROM node:20-alpine

WORKDIR /app

# Package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build aşaması dev modunda kaldırıldı (çünkü build sırasında backend'e ulaşılamıyor)
# RUN npm run build

# Expose port
EXPOSE 8000

# Start
CMD ["npm", "run", "start"]
