# ============================================================
# Storefront — Production build (next build + next start)
# next dev kaldırıldı: yüklü sunucuda her istekte derleme yapıp
# 30s+ sürüyor ve Traefik 504 veriyordu. Production build ile
# derleme build aşamasında bir kez yapılır; çalışma anında hızlı/stabil.
# Tüm sayfalar force-dynamic (SSR) olduğu için build backend gerektirmez.
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Bağımlılıklar
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Kaynak kod
COPY . .

# NEXT_PUBLIC_* değerleri build sırasında client bundle'a gömülür.
# Coolify bunları compose build.args üzerinden geçer.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SEARCH_ENDPOINT
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_SEARCH_ENDPOINT=$NEXT_PUBLIC_SEARCH_ENDPOINT
ENV NODE_ENV=production

# Production build (force-dynamic sayesinde backend gerekmez)
RUN npm run build

EXPOSE 8000

CMD ["npm", "run", "start"]
