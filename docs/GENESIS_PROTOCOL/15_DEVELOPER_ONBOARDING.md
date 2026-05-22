# 👨‍💻 DEVELOPER ONBOARDING GUIDE

> **"İyi bir başlangıç, başarılı bir yolculuğun anahtarıdır."**

Bu rehber, PROJECT-AYNA-GENESIS projesine yeni katılan geliştiricilerin hızlı ve etkili bir şekilde projeye adapte olmalarını sağlamak için hazırlanmıştır.

---

## 📋 İçindekiler

1. [Hoş Geldiniz](#hoş-geldiniz)
2. [Proje Özeti](#proje-özeti)
3. [Teknoloji Stack](#teknoloji-stack)
4. [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
5. [Proje Yapısı](#proje-yapısı)
6. [Kod Standartları](#kod-standartları)
7. [İlk Commit Rehberi](#ilk-commit-rehberi)
8. [Sık Karşılaşılan Sorunlar](#sık-karşılaşılan-sorunlar)
9. [Kaynaklar ve Referanslar](#kaynaklar-ve-referanslar)

---

## 🎉 Hoş Geldiniz

PROJECT-AYNA-GENESIS'e hoş geldiniz! 🚀

Bu proje, Medusa v2 üzerine inşa edilmiş, AI destekli bir e-ticaret platformudur.    bir e-ticaret sitesi () için geliştirilmiş olup, **Ayna** adında bir AI asistanı ile donatılmıştır.

### Projeye Katkıda Bulunmadan Önce

1. **Bu rehberi okuyun**
2. **[00_SUPREME_LAW.md](./00_SUPREME_LAW.md)** dosyasını MUTLAKA okuyun - projenin anayasasıdır
3. **[08_ARCHITECTURE_SEAL.md](./08_ARCHITECTURE_SEAL.md)** dosyasını inceleyin - mühürlü alanları öğrenin
4. **Geliştirme ortamını kurun** (aşağıda anlatılmıştır)

---

## 🎯 Proje Özeti

### Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| **Ayna AI** | Gemini destekli AI asistanı, ürün arama, stok kontrolü, havuz kimyasalları hesaplama |
| **Multi-Tenancy** | Çoklu mağaza sistemi, her tenant kendi verisine sahip |
| **Conscience** | AI kararları için etik filtre ve bütçe kontrolü |
| **Content Engine** | AI destekli blog ve içerik yönetimi |
| **Wishlist** | Müşteri istek listesi ve stok bildirimleri |
| **Ödeme Sistemleri** | PayTR, Iyzico entegrasyonları |
| **Kargo** | Yurtiçi Kargo entegrasyonu |

### Mimari Yaklaşım

- **Backend:** Medusa v2 (Node.js + TypeScript)
- **Frontend:** Next.js 15 (App Router)
- **Database:** PostgreSQL 15 + pgvector
- **Cache:** Redis
- **Search:** Meilisearch
- **AI:** Google Gemini + Ollama fallback

---

## 🛠️ Teknoloji Stack

| Katman | Teknoloji | Versiyon | Amaç |
|--------|-----------|----------|------|
| **Backend Framework** | Medusa | 2.13.4 | E-ticaret altyapısı |
| **Frontend Framework** | Next.js | 15.x | Kullanıcı arayüzü |
| **Dil** | TypeScript | 5.0+ | Tip güvenliği |
| **Database** | PostgreSQL | 15 | Ana veri deposu |
| **Vector DB** | pgvector | - | AI embedding'ler |
| **Cache** | Redis | Alpine | Mesaj kuyruğu |
| **Search** | Meilisearch | 1.13 | Hızlı ürün arama |
| **AI** | Gemini | 1.5-flash | Birincil AI |
| **Fallback AI** | Ollama | llama3 | Yedek AI |
| **Container** | Docker | Latest | Ortam izolasyonu |

---

## 🚀 Geliştirme Ortamı Kurulumu

### 1. Ön Koşullar

Sisteminizde aşağıdakilerin kurulu olması gerekir:

```bash
# Node.js (v20+)
node --version  # v20.x.x

# npm
npm --version   # 10.x.x

# Docker & Docker Compose
docker --version
docker-compose --version

# Git
git --version
```

### 2. Projeyi Klonlayın

```bash
git clone git@github.com:aynagenesis/platform.git
cd PROJECT-AYNA-GENESIS-push-20260402
```

### 3. Environment Değişkenlerini Ayarlayın

```bash
# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin
# GEMINI_API_KEY, DATABASE_URL, REDIS_URL gibi kritik değişkenleri doldurun
```

**Gerekli Environment Değişkenleri:**

```env
# Database
DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa-genesis

# AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_NAME=gemini-1.5-flash

# Fallback AI
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL_NAME=llama3

# Redis
REDIS_URL=redis://redis:6379

# Search
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=masterKey

# JWT & Security
JWT_SECRET=your_strong_jwt_secret
COOKIE_SECRET=your_strong_cookie_secret

# CORS
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:9000,http://localhost:5173
AUTH_CORS=http://localhost:9000,http://localhost:8000
```

### 4. Docker ile Başlatma

```bash
# Tüm servisleri başlat (PostgreSQL, Redis, Meilisearch, Backend, Frontend)
docker-compose up -d

# Logları izle
docker-compose logs -f

# Servislerin durumunu kontrol et
docker-compose ps
```

### 5. Veritabanı Kurulumu

```bash
# Veritabanını oluştur
npm run db:create

# Migration'ları çalıştır
npm run db:migrate

# İlk kurulumu yap (admin kullanıcısı vb.)
# POST /admin/setup endpoint'ini çağırın
```

### 6. Geliştirme Sunucularını Başlatma

```bash
# Backend (Medusa) - Port 9000
npm run dev

# Frontend (Next.js) - Port 8000
cd storefront
npm run dev
```

### 7. Erişim

| Servis | URL | Kullanıcı |
|--------|-----|-----------|
| **Storefront** | http://localhost:8000 | - |
| **Admin Panel** | http://localhost:9000/app | admin@aynahavuz.com / password |
| **API** | http://localhost:9000 | - |

---

## 📁 Proje Yapısı

```
PROJECT-AYNA-GENESIS/
├── src/                          # Backend (Medusa v2)
│   ├── api/                      # API Route'ları
│   │   ├── admin/               # Admin API'leri (JWT gerekli)
│   │   │   ├── ayna/            # AI chat admin endpoint
│   │   │   ├── tenants/         # Tenant yönetimi
│   │   │   └── setup/           # Sistem kurulumu
│   │   └── store/               # Store API'leri (public)
│   │       ├── ayna/            # AI chat store endpoint
│   │       ├── wishlist/        # İstek listesi
│   │       └── tenant/          # Tenant-specific endpoints
│   ├── modules/                  # Özel Medusa Modülleri
│   │   ├── ayna/                # 🤖 AI Chat Agent
│   │   │   ├── services/        # AI servisleri
│   │   │   ├── tools/           # AI araçları
│   │   │   ├── models/          # Veri modelleri
│   │   │   └── prompts/         # AI prompt'ları
│   │   ├── tenant/              # 🏢 Multi-Tenancy Modülü
│   │   │   ├── services/        # Tenant servisleri
│   │   │   ├── models/          # Tenant modelleri
│   │   │   ├── migrations/      # DB migration'ları
│   │   │   └── loaders/         # RLS ve isolation
│   │   ├── content_engine/      # 📝 Blog/CMS
│   │   ├── conscience/          # ⚖️ Etik Filtre
│   │   ├── wishlist/            # ❤️ İstek Listesi
│   │   ├── subscription/        # 🔄 Abonelik (BETA)
│   │   └── loyalty/             # 🏆 Sadakat Programı (BETA)
│   ├── providers/               # Harici Servis Entegrasyonları
│   │   ├── paytr/               # PayTR ödeme
│   │   ├── iyzico/              # Iyzico ödeme
│   │   ├── brevo/               # Brevo email
│   │   ├── cloudinary/          # Cloudinary dosya
│   │   └── yurtici/             # Yurtiçi Kargo
│   ├── workflows/               # Saga Pattern İş Akışları
│   ├── links/                   # Cross-Module Entity Linkleri
│   ├── subscribers/             # Event-Driven Handler'lar
│   ├── jobs/                    # Scheduled Background Jobs
│   ├── middlewares/             # API Middleware'ler
│   ├── lib/                     # Yardımcı Kütüphaneler
│   └── utils/                   # Utility Fonksiyonlar
│
├── storefront/                   # Frontend (Next.js 15)
│   ├── src/
│   │   ├── app/                 # App Router Sayfaları
│   │   │   ├── [countryCode]/   # Locale-aware routes
│   │   │   └── api/             # Next.js API routes
│   │   ├── modules/             # UI Bileşenleri
│   │   │   └── chat/            # Ayna chat widget
│   │   └── lib/                 # Veri Katmanı
│   └── public/                  # Statik dosyalar
│
├── docs/                         # Dokümantasyon
│   └── GENESIS_PROTOCOL/        # Mimari Protokol Belgeleri
│
├── docker/                       # Docker yapılandırması
├── n8n/                          # N8N workflow otomasyonu
├── docker-compose.yml            # Docker orchestration
├── medusa-config.ts              # Medusa konfigürasyonu
└── package.json                  # Node.js dependencies
```

---

## 📝 Kod Standartları

### TypeScript

- **Strict mode** aktif (`tsconfig.json`'da `"strict": true`)
- Tüm fonksiyonlar ve değişkenler tip tanımlı olmalı
- `any` kullanımı **YASAKTIR**
- Interface ve type'lar PascalCase
- Değişkenler camelCase
- Sabitler UPPER_SNAKE_CASE

### Medusa v2 Pattern'leri

#### ❌ YASAK (Medusa v1)
```typescript
// TypeORM Entity - KESİNLİKLE YASAK
@Entity()
class Product {
  @PrimaryGeneratedColumn()
  id: number;
}

// Service decorator - YASAK
@Service()
class ProductService {}

// Container as any - YASAK
const service = (container as any).resolve("productService");
```

#### ✅ DOĞRU (Medusa v2)
```typescript
// DML Model
import { model } from "@medusajs/framework/utils";

const Product = model.define("product", {
  id: model.text().primaryKey(),
  title: model.text(),
  price: model.number(),
});

// Module Service
export default Module("mymodule", {
  service: MyService,
});

// remoteQuery veya dependency injection
const productModule = container.resolve("product");
```

### API Route Standartları

#### Zod Validation (ZORUNLU)
```typescript
import { z } from "zod";
import { defineRoute } from "@medusajs/framework/http";

const createProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  handle: z.string().regex(/^[a-z0-9-]+$/, "Invalid handle format"),
  price: z.number().positive("Price must be positive"),
});

export const POST = defineRoute(async (req, res) => {
  const validatedData = createProductSchema.parse(req.body);
  // ... işlem
});
```

#### Authentication
```typescript
import { authenticate } from "@medusajs/framework/http";

// Admin route
export const POST = defineRoute(
  authenticate("admin", ["bearer", "session"]),
  async (req, res) => { /* ... */ }
);

// Store route (optional auth)
export const POST = defineRoute(
  authenticate("customer", ["bearer", "session"], { allowUnauthorized: true }),
  async (req, res) => { /* ... */ }
);
```

### Workflow Standartları

```typescript
import { createStep, createWorkflow } from "@medusajs/framework/workflows-sdk";

// Step with compensation
const myStep = createStep(
  "my-step",
  async (input: { value: string }, { container }) => {
    // İşlem
    const result = await doSomething(input.value);
    
    // Compensation (rollback)
    return {
      invoke: result,
      compensate: async () => {
        await undoSomething(result);
      },
    };
  }
);

// Workflow
const myWorkflow = createWorkflow("my-workflow", function (input) {
  const step1Result = step1(input);
  return step2(step1Result);
});
```

### Commit Mesajı Standartları

```
feat: add new AI tool for pool volume calculation
fix: resolve memory leak in Ayna service
docs: update API reference documentation
refactor: improve tenant isolation logic
test: add unit tests for payment providers
chore: update dependencies
```

---

## 🔄 İlk Commit Rehberi

### 1. Branch Oluşturma

```bash
# Ana branch'ten güncel branch oluştur
git checkout main
git pull origin main

# Feature branch oluştur
git checkout -b feature/your-feature-name
```

### 2. Değişiklikleri Yap

- Küçük, odaklanmış değişiklikler yap
- Her commit tek bir mantıksal değişiklik içersin
- Testleri yaz ve çalıştır

### 3. Test Et

```bash
# TypeScript derleme kontrolü
npx tsc --noEmit

# Tüm testleri çalıştır
npm test

# Belirli bir test dosyası
npx jest path/to/file.spec.ts

# Linting (varsa)
npm run lint
```

### 4. Commit ve Push

```bash
# Değişiklikleri ekle
git add .

# Commit (anlamlı mesaj)
git commit -m "feat: add new AI tool for pool volume calculation"

# Push
git push origin feature/your-feature-name
```

### 5. Pull Request Oluştur

1. GitHub'da PR oluştur
2. Açıklamaya değişiklik detaylarını ekle
3. İlgili issue'ları link'le
4. Review için takım üyelerini ata

---

## 🐛 Sık Karşılaşılan Sorunlar

### 1. Docker Container Başlamıyor

**Sorun:** `docker-compose up -d` sonrası container'lar çalışmıyor.

**Çözüm:**
```bash
# Logları kontrol et
docker-compose logs medusa_server_core_v2

# Container'ı yeniden başlat
docker-compose restart medusa_server_core_v2

# Cache temizle ve rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 2. Migration Hataları

**Sorun:** `npm run db:migrate` hata veriyor.

**Çözüm:**
```bash
# Database'i sıfırla (DİKKAT: Tüm veriler silinir!)
docker-compose down -v
docker-compose up -d
npm run db:create
npm run db:migrate
```

### 3. TypeScript Derleme Hataları

**Sorun:** `npx tsc --noEmit` hataları.

**Çözüm:**
- Hata mesajlarını dikkatlice oku
- Tip tanımlarını kontrol et
- Import path'lerini doğrula
- `any` kullanımından kaçın

### 4. AI Endpoint Hataları (429/500)

**Sorun:** Gemini API hata veriyor.

**Çözüm:**
- `.env`'de `OLLAMA_API_URL` ve `OLLAMA_MODEL_NAME` tanımla
- Fallback AI otomatik devreye girecektir
- Rate limiting ayarlarını kontrol et

### 5. Tenant İzolasyon Sorunları

**Sorun:** Farklı tenant'ların verileri karışıyor.

**Çözüm:**
- `tenant-isolation-filter.ts` devrede mi kontrol et
- RLS (Row Level Security) kuralları doğru mu?
- `__system__` bypass sadece sistem işlemleri için kullanılmalı

---

## 📚 Kaynaklar ve Referanslar

### Zorunlu Okumalar

1. **[00_SUPREME_LAW.md](./00_SUPREME_LAW.md)** - Proje anayasası, MUTLAKA okuyun
2. **[08_ARCHITECTURE_SEAL.md](./08_ARCHITECTURE_SEAL.md)** - Mühürlü alanlar
3. **[01_PROJECT_BIBLE.md](./01_PROJECT_BIBLE.md)** - Teknik kurallar

### Faydalı Belgeler

4. **[03_API_REFERENCE.md](./03_API_REFERENCE.md)** - API endpoint'leri
5. **[04_MODULE_GUIDE.md](./04_MODULE_GUIDE.md)** - Modül açıklamaları
6. **[10_MASTER_ARCHITECT_MANUAL.md](./10_MASTER_ARCHITECT_MANUAL.md)** - Mimari rehber
7. **[11_PROVIDER_GUIDE.md](./11_PROVIDER_GUIDE.md)** - Provider entegrasyonları

### Dış Kaynaklar

- **Medusa Resmi Dokümanları:** [docs.medusajs.com](https://docs.medusajs.com)
- **Medusa GitHub:** [github.com/medusajs](https://github.com/medusajs)
- **Medusa Discord:** [discord.gg/medusajs](https://discord.gg/medusajs)

---

## 🤝 İletişim ve Destek

### Takım İçi İletişim

- **GitHub Issues:** Feature request ve bug report için
- **Slack/Discord:** Hızlı sorular için
- **Code Review:** PR'larda detaylı geri bildirim

### Yardım Almadan Önce

1. Dokümantasyonu kontrol et
2. Benzer issue'ları ara
3. Hata mesajını Google'la
4. Debug loglarını incele

---

## 🎯 Sonraki Adımlar

İlk gününüzde:

1. ✅ Bu rehberi okudunuz
2. ⬜ Geliştirme ortamını kurun
3. ⬜ Projeyi çalıştırın
4. ⬜ Zorunlu okumaları tamamlayın
5. ⬜ İlk küçük değişikliği yapın (örneğin documentation fix)

İlk haftanızda:

1. ⬜ Bir feature üzerinde çalışın
2. ⬜ Test yazma pratiği yapın
3. ⬜ Code review'lara katılın
4. ⬜ Takım toplantılarına katılın

---

**Hoş geldiniz! 🚀**

Sorularınız için takım lideriyle iletişime geçin.