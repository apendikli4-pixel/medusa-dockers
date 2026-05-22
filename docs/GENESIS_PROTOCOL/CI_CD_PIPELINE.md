# CI/CD PIPELINE DOKÜMANTASYONU

**Tarih:** 2026-05-01  
**Durum:** HAZIR  
**Amaç:** Otomatik test, derleme ve dağıtım pipeline'ları

---

## 📋 GENEL BAKIŞ

PROJECT-AYNA-GENESIS için GitHub Actions tabanlı CI/CD pipeline'ları. Tüm PR'lar otomatik test edilir, üretime dağıtım approval ile yapılır.

---

## 🔄 PIPELINE AŞAMALARI

### 1. LINT & TYPE CHECK (Her Push/PR'da)
```
⏱️ Çalışma Süresi: ~2 dakika
🎯 Amaç: Kod kalitesi kontrolü
```

**Adımlar:**
```yaml
- name: Lint Backend
  run: npm run lint

- name: Type Check Backend
  run: npx tsc --noEmit

- name: Lint Storefront
  working-directory: ./storefront
  run: npm run lint
```

**Başarı Kriterleri:**
- Zero lint hataları
- TypeScript strict mode geçilmeli
- Backend + storefront her ikisi de temiz olmalı

---

### 2. TEST (Her Push/PR'da)
```
⏱️ Çalışma Süresi: ~5-10 dakika
🎯 Amaç: Birim ve entegrasyon testlerinin geçmesi
```

**Kapsam:**
- Backend: `**/__tests__/**/*.spec.ts`
- Mock: `src/modules/ayna/__tests__/__mocks__/medusa-utils.ts`

**Komut:**
```bash
npm test -- --coverage --detectOpenHandles
```

**Başarı Kriterleri:**
- Test coverage: ≥80%
- Test suite: 0 failures
- No hanging processes

---

### 3. BUILD (PR Merge'de)
```
⏱️ Çalışma Süresi: ~3 dakika
🎯 Amaç: Derlemenin başarılı olduğunu doğrulama
```

**Adımlar:**
```bash
# Backend build
npm run build

# Storefront build
cd storefront
npm run build
```

**Başarı Kriterleri:**
- `dist/` ve `.medusa/` oluşturulmalı
- Storefront `.next/` build artifact'ları olmalı

---

### 4. SECURITY SCAN (Her PR'da)
```
🎯 Amaç: Dependency vulnerability kontrolü
```

**Tool'lar:**
```bash
npm audit --audit-level moderate
npx deprecated-dependencies
```

**Başarı Kriterleri:**
- Zero critical vulnerabilities
- No deprecated packages in production deps

---

### 5. DOCKER BUILD (Main Branch'de)
```
⏱️ Çalışma Süresi: ~8-12 dakika
🎯 Amaç: Docker imajlarını build etme ve test
```

**Image'lar:**
1. `medusa-backend:latest`
2. `medusa-storefront:latest`

**Push Rules:**
- `main` branch → Docker Hub `:latest` tag
- `v*` tags → Docker Hub `:version` tag
- PR'lar Sadece local build, push yapılmaz

---

### 6. INTEGRATION TEST (Main Branch'de)
```
⏱️ Çalışma Süresi: ~10 dakika
🎯 Amaç: Docker compose ile tüm servislerin beraber çalışmasını test etme
```

**Adımlar:**
```bash
docker-compose -f docker-compose.ci.yml up -d
sleep 30  # Wait for services

# Health check
curl -f http://localhost:9000/health || exit 1
curl -f http://localhost:8000/api/health || exit 1

# Run integration tests
npm run test:integration

docker-compose -f docker-compose.ci.yml down
```

**Başarı Kriterleri:**
- Tüm servisler up olmalı
- Health endpoint'ler 200 dönmeli
- Integration testleri geçmeli

---

### 7. STAGING DEPLOY (Main Branch'de)
```
🎯 Amaç: Staging ortamına otomatik dağıtım
```

**Triggers:**
- `main` branch push
- Sadece pipeline önceki bütün aşamalardan geçmişse

**Deployment:**
```bash
# Render/Vercel/Heroku API push
git push https://github.com/username/repo.git main

# Veya Docker registry push
docker push org/medusa-backend:$SHA
docker push org/medusa-storefront:$SHA
```

**Post-Deploy Test:**
```bash
# Smoke test
curl -f https://staging.ayna.com/health
curl -f https://staging.ayna.com/store/ayna/chat -X POST -d '{"message":"test"}'
```

---

### 8. PRODUCTION DEPLOY (Manual Trigger)
```
🎯 Amaç: Production ortamına onaylı dağıtım
```

**Requirements:**
- ✅ Tüm testler geçmiş olmalı
- ✅ Staging smoke test geçmiş olmalı
- ✅ CODEOWNERS onayı alınmış olmalı (backend + frontend)
- ✅ Security scan temiz olmalı

**Deployment:**
```bash
# Manual trigger from GitHub Actions UI
# Veya CLI ile:
gh workflow run deploy-prod.yml --ref main
```

**Rollback Prosedürü:**
```bash
# Previous image'a geri dön
docker-compose -f docker-compose.prod.yml pull medusa-server:previous
docker-compose -f docker-compose.prod.yml up -d --no-build medusa-server

# Veya database restore (son backup'tan)
psql $DATABASE_URL < backups/prod-$(date -d "1 hour ago" +%Y%m%d-%H%M).sql
```

---

## 🔐 GÜVENLİK & SECRETS

### GitHub Secrets (Repository → Settings → Secrets)

| Secret | Açıklama | Örnek Değer |
|--------|----------|-------------|
| `DATABASE_URL` | Production DB connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing key | Random 64-char string |
| `GEMINI_API_KEY` | Google Gemini API | `AIzaSy...` |
| `REDIS_URL` | Redis connection | `redis://...` |
| `DOCKER_USERNAME` | Docker Hub user | `aynateam` |
| `DOCKER_PASSWORD` | Docker Hub token | `dckr_pat_...` |
| `MEDUSA_ADMIN_EMAIL` | Admin user email | `admin@ayna.com` |
| `MEDUSA_ADMIN_PASSWORD` | Admin password | Strong pass |

**Never store:**
- `.env` files
- SSL certificates
- Private keys

---

## 📊 PIPELINE STATUS

| Pipeline | Trigger | Süre | Approvals |
|----------|---------|------|-----------|
| Lint+Type | Push/PR | 2 min | ❌ Auto |
| Test | Push/PR | 5-10 min | ❌ Auto |
| Security Scan | Push/PR | 1 min | ❌ Auto |
| Docker Build | Main | 10 min | ❌ Auto |
| Integration Test | Main | 10 min | ❌ Auto |
| Staging Deploy | Main | 3 min | ❌ Auto |
| Production Deploy | Manual | 5 min | ✅ Required |

---

## 🚨 FAILURE HANDLING

### Pipeline Başarısız Olursa:

1. **Lint/Type Hataları:**
   - Fix locally: `npm run lint && npx tsc --noEmit`
   - Commit and push again

2. **Test Failures:**
   ```bash
   npm test -- --verbose
   # Debug failing test, fix, re-push
   ```

3. **Docker Build Failure:**
   - Check Dockerfile syntax
   - Verify dependencies in package.json
   - Re-run with `--no-cache` locally

4. **Integration Test Failure:**
   - Check docker-compose.ci.yml
   - View logs: `docker-compose -f docker-compose.ci.yml logs`
   - Common issue: DB migration pending → run `npx medusa db:migrate`

5. **Staging Smoke Test Failure:**
   - Check staging logs via Render dashboard
   - Common issue: ENV vars missing → add to staging config

---

## 📁 DOSYA YAPISI

```
.github/
├── workflows/
│   ├── lint-and-typecheck.yml      # Lint + TypeScript check
│   ├── test.yml                    # Unit + integration tests
│   ├── security-scan.yml           # Vulnerability scan
│   ├── docker-build.yml            # Build and push images
│   ├── integration-test.yml        # Docker compose test
│   ├── deploy-staging.yml          # Auto-deploy staging
│   └── deploy-prod.yml             # Manual approval deploy
│
├── CODEOWNERS                      # Required reviewers for deploy
└── PULL_REQUEST_TEMPLATE.md        # PR checklist
```

---

## 🏷️ SEMANTIC VERSIONING

`package.json` version'ları `MAJOR.MINOR.PATCH` formatında:

- **MAJOR** (x.0.0): Breaking changes (DELETE/BREAKING in commit)
- **MINOR** (0.x.0): New features (FEATURE in commit)
- **PATCH** (0.0.x): Bug fixes (FIX in commit)

**Automatic Version Bump:**
```bash
# Conventional commits ile otomatik:
npm run release -- --release-as minor
```

---

## 🔔 NOTIFICATIONS

**Slack Notifications (Optional):**
- Pipeline başarı/başarısızlığı → #devops-kanalı
- Production deploy → #oncall-kanalı

**Setup:**
1. Slack App: Incoming Webhooks
2. Add secret: `SLACK_WEBHOOK_URL`
3. Add to workflow `notifications:` step

---

## 📚 EKSIK DOKÜMANTASYON

Bu dokümantasyon eksikse şunları ekle:

1. **Local development workflow** → `docs/DEVELOPMENT_WORKFLOW.md`
2. **Docker deployment guide** → `docs/DOCKER_DEPLOYMENT.md`
3. **Database migration procedures** → `docs/DATABASE_MIGRATIONS.md`
4. **Troubleshooting common CI failures** → `docs/CI_TROUBLESHOOTING.md`

---

## 🆘 SUPPORT

Pipeline hatası durumunda:
1. Workflow log'larını incele (`Actions` tab)
2. `docker-compose.ci.yml` config'ini kontrol et
3. Local'de aynı step'i tekrar çalıştır
4. **KILO'ya sor:** "CI pipeline failed at step X, error Y"

---

**SON GÜNCELLEME:** 2026-05-01  
**DOKÜMAN ID:** CI_CD_PIPELINE_001
