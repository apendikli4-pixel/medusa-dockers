# ÜRETİM DAĞITIM KILAVUZU

**Tarih:** 2026-05-01  
**Durum:** HAZIR  
**Amaç:** Production ortamı kurulumu, dağıtım ve yönetim

---

## 🏗️ ÜRETİM ALTYAPI TASARIMI

### Mimarisi: "Sovereign Cloud"

```
┌─────────────────────────────────────────────────────────┐
│                  CLOUDFLARE (CDN + WAF)                │
│  DDoS Protection, SSL, Caching, Rate Limiting          │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  AWS/GOOGLE CLOUD                      │
│  ┌─────────────┐          ┌──────────────┐             │
│  │ EC2/VM      │          │  RDS (DB)    │             │
│  │ Medusa      │◄────────►│  PostgreSQL  │             │
│  │ Server      │          │  + pgvector  │             │
│  └─────────────┘          └──────────────┘             │
│                            │                            │
│  ┌─────────────┐          ┌──────────────┐             │
│  │  Redis      │          │   S3/Cloud   │             │
│  │  Elasticache│          │  Storage     │             │
│  └─────────────┘          └──────────────┘             │
│                            │                            │
│  ┌─────────────┘          ┌──────────────┘             │
│  │  S3/CloudFront│        │   Meilisearch │             │
│  │  Static Files │        │   Cloud/VM    │             │
│  └───────────────┘        └──────────────┘             │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS STOREFRONT (Vercel/Netlify)       │
│  Global CDN, Edge Functions, ISR                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 DAĞITIM SEÇENEKLERI

### Seçenek 1: Docker Compose (Recommended for Start)
**Kullanım:** Small/Medium scale, <50k istek/ay  
**Maliyet:** $50-150/ay  
**Zorluk:** Kolay ⭐

**Adımlar:**

```bash
# 1. Sunucu hazırlığı (Ubuntu 22.04 LTS)
sudo apt update && sudo apt install -y docker.io docker-compose git nginx

# 2. Repository clone
git clone https://github.com/username/PROJECT-AYNA-GENESIS.git
cd PROJECT-AYNA-GENESIS

# 3. Production .env
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres-host/medusa-genesis
REDIS_URL=redis://redis-host:6379
JWT_SECRET=<64-char-random>
GEMINI_API_KEY=AIzaSy...
MEILISEARCH_HOST=http://meilisearch-host:7700
MEILISEARCH_MASTER_KEY=<master-key>
EOF

# 4. Docker compose up
docker-compose -f docker-compose.prod.yml up -d

# 5. Medusa başlat
docker exec medusa_server_core_v2 npx medusa develop

# 6. DB migrate
docker exec medusa_server_core_v2 npx medusa db:migrate

# 7. Admin user oluştur
docker exec medusa_server_core_v2 npx medusa user -e admin@ayna.com
```

---

### Seçenek 2: AWS (Scalable Enterprise)
**Kullanım:** Large scale, >100k istek/ay  
**Maliyet:** $300-1000/ay  
**Zorluk:** Orta ⭐⭐

**Services:**
- **EC2**: Medusa Backend (Auto Scaling Group)
- **RDS**: PostgreSQL + pgvector (Multi-AZ)
- **Elasticache**: Redis Cluster
- **S3 + CloudFront**: Static assets + storefront
- **ECS/EKS**: Container orchestration (isteğe bağlı)

**Terraform template'i:** `infrastructure/aws/` altında

---

### Seçenek 3: Kubernetes (Microservices)
**Kullanım:** Very large scale, multi-region  
**Maliyet:** $500-2000/ay  
**Zorluk:** Zor ⭐⭐⭐

**Komponentler:**
- Medusa Server Deployment
- Medusa Worker Deployment (queue worker)
- PostgreSQL StatefulSet + pgvector
- Redis Cluster
- Meilisearch StatefulSet
- Ingress (NGINX/ALB)
- ConfigMap + Secret management

**Helm Chart:** `helm/medusa-ayna/`

---

## 🔧 ADIM ADIM ÜRETİM KURULUMU

### A. Sunucu Hazırlığı

```bash
# 1. OS güncelle
sudo apt update && sudo apt upgrade -y

# 2. Docker kur
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. Docker Compose kur
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

### B. Repository ve Configure

```bash
# 1. App dizini
sudo mkdir -p /srv/ayna-genesis
sudo chown $USER:$USER /srv/ayna-genesis
cd /srv/ayna-genesis

# 2. Clone
git clone https://github.com/username/PROJECT-AYNA-GENESIS.git .
git checkout production

# 3. Env file (ENV şifreleri güvenli kaydedin!)
nano .env  # veya vim
# ... Ekle:
# DATABASE_URL=...
# JWT_SECRET=<random>
# GEMINI_API_KEY=...

# 4. Docker secrets (opsiyonel, daha güvenli)
mkdir -p /run/secrets
echo "your-jwt-secret-here" > /run/secrets/JWT_SECRET
```

---

### C. Database Kurulumu

```bash
# 1. Docker volume'dan DB export (eğer mevcut DB'niz varsa)
docker run --rm -v postgres_data:/var/lib/postgresql/data -v $(pwd)/backup:/backup alpine tar czf /backup/db.tar.gz -C /var/lib/postgresql/data .

# 2. Production DB oluştur
docker exec -i medusa_postgres_v2 psql -U postgres <<EOF
CREATE DATABASE medusa-genesis;
CREATE USER medusa_user WITH PASSWORD '<strong-pass>';
GRANT ALL PRIVILEGES ON DATABASE medusa-genesis TO medusa_user;
EOF

# 3. Migrate
docker exec medusa_server_core_v2 npx medusa db:migrate

# 4. Admin user
docker exec medusa_server_core_v2 npx medusa user -e admin@ayna.com -p "<admin-pass>"
```

---

### D. SSL/HTTPS (Let's Encrypt)

```bash
# 1. Nginx proxy config
sudo nano /etc/nginx/sites-available/ayna-genesis
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name ayna.com www.ayna.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ayna.com www.ayna.com;

    ssl_certificate /etc/letsencrypt/live/ayna.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ayna.com/privkey.pem;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /store {
        proxy_pass http://localhost:9000;
        # same headers...
    }
}
```

```bash
# 2. Certbot ile SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ayna.com -d www.ayna.com

# 3. Auto-renewal test
sudo certbot renew --dry-run
```

---

### E. Monitoring Setup (Opsiyonel Ama Önerilir)

```bash
# 1. Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Health check endpoint'lerini kontrol et
curl -f https://ayna.com/health || echo "DOWN"

# 3. UptimeRobot (free monitoring)
# https://uptimerobot.com/ add monitors:
# - https://ayna.com/health (every 5 min)
# - https://ayna.com/store/ayna/chat (every 15 min)
```

---

## 🔄 DAĞITIM (DEPLOYMENT) ADIMLARI

### Her Güncelleme İçin:

```bash
#!/bin/bash
# deploy.sh - production deployment script

set -e

echo "🚀Deploy başlıyor..."

# 1. Git pull
git fetch origin production
git checkout production
git pull origin production

# 2. Docker build
docker-compose -f docker-compose.prod.yml build

# 3. Migration (eğer DB schema değiştiyse)
docker exec medusa_server_core_v2 npx medusa db:migrate

# 4. Restart services (zero-downtime için)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale medusa-server=2
sleep 10
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale medusa-server=1

# 5. Health check
curl -f https://ayna.com/health || exit 1

echo "✅ Deploy tamamlandı!"
```

**Zero-downtime için:** Blue-Green deploy veya rolling update kullanın.

---

## 🔄 ROLLBACK PROSEDÜRÜ

```bash
#!/bin/bash
# rollback.sh - son çalışan versiyona dönüş

# 1. Docker image tag'lerini listele
docker images | grep medusa-backend

# 2. Önceki image'a geçiş
docker tag medusa-backend:previous medusa-backend:current
docker-compose -f docker-compose.prod.yml up -d --no-build

# 3. DB restore (son backup'tan)
# Eğer DB migration problemi varsa:
pg_restore -h localhost -U postgres -d medusa-genesis backups/latest.sql

# 4. Health check
curl -f https://ayna.com/health || echo "Rollback FAILED - MANUAL INTERVENTION!"
```

**Rollback tetikleyicileri:**
- Health check 5xx hataları > 10%
- Error rate > 5% (5 dakika içinde)
- Customer complaint spike

---

## 🛡️ GÜVENLİK HARDENING

```bash
# 1. Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH limitli
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. Docker güvenliği
sudo nano /etc/docker/daemon.json
{
  "icc": false,
  "userns-remap": "default",
  "no-new-privileges": true,
  "read-only": true
}
sudo systemctl restart docker

# 3. Log rotation
sudo nano /etc/logrotate.d/ayna-genesis
# ... medusa-server logs için 7 gün rotation

# 4. Fail2ban (brute-force koruması)
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# SSH ve Medusa admin paneli için rate-limit
```

---

## 📊 MONITORING METRIKLERI

** Kritik Metric'ler:**

| Metric | Threshold | Alert |
|--------|-----------|-------|
| CPU Usage | >80% (5 min) | ⚠️ Warning |
| Memory Usage | >90% | 🔴 Critical |
| Disk Usage | >85% | ⚠️ Warning |
| API Response Time | >2000ms | ⚠️ Warning |
| Error Rate | >5% | 🔴 Critical |
| DB Connection Pool | >80% | ⚠️ Warning |
| Redis Memory | >90% | ⚠️ Warning |

**Grafana Dashboard:** `monitoring/grafana/dashboards/ayna-overview.json`

---

## 💾 BACKUP STRATEJİSİ

```bash
# 1. Database backup (her gece 02:00)
0 2 * * * docker exec medusa_postgres_v2 pg_dump -U postgres medusa-genesis > /backups/db-$(date +\%Y\%m\%d).sql

# 2. Docker volumes backup (weekly)
0 3 * * 0 docker run --rm -v postgres_data:/data -v /backups:/backup alpine tar czf /backup/volumes-$(date +\%Y\%m\%d).tar.gz -C /data .

# 3. Upload to S3 (offsite)
aws s3 sync /backups/ s3://ayna-backups/prod/ --delete

# 4. Retention: 30 gün
find /backups -type f -mtime +30 -delete
```

---

## 🚨 OLAYGIR (ON-CALL) PROTOCOL

**Severity 1 (Production Down):**
- İçinde: Tüm servisler down, kullanıcılar erişemiyor
- Yanıt: 5 dakika içinde
- İletişim: Slack #oncall-kanalı + SMS

**Severity 2 (Major Degradation):**
- İçinde: Ödeme/checkout çalışmıyor, AI hata veriyor
- Yanıt: 30 dakika içinde
- İletişim: Slack #dev-kanalı

**Severity 3 (Minor):**
- İçinde: UI bug, performans düşüklüğü
- Yanıt: İş günü içinde
- İletişim: GitHub Issues

---

## 📞 DESTEK İLETİŞİM

| Sorun | İletişim |
|-------|----------|
| Production Down | Slack: #oncall (tag @oncall) |
| Security Issue | security@ayna.com (PGP: keys/ayna.asc) |
| Database Issue | DB Admin: +90XXX XXX XX XX |
| Infrastructure | DevOps: +90XXX XXX XX XX |

---

**SON GÜNCELLEME:** 2026-05-01  
**DOKÜMAN ID:** PROD_DEPLOY_001
