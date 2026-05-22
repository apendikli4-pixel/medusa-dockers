# 🌟 PROJECT AYNA GENESIS

> **Medusa v2 + AI-Powered E-Commerce Platform**

Ayna Genesis, Medusa v2 üzerine inşa edilmiş, yapay zeka destekli bir e-ticaret platformudur.

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Docker ile başlat
docker-compose up -d

# 2. Admin paneline git
http://localhost:9000/app

# 3. Storefront'u aç
http://localhost:8000
```

---

## 📁 Proje Yapısı

```
PROJECT-AYNA-GENESIS/
├── src/                          # Backend (Medusa v2)
│   ├── api/                      # API Route'ları
│   │   ├── admin/               # Admin API'leri
│   │   │   ├── ayna/            # AI chat admin endpoint
│   │   │   ├── tenants/         # 🏢 Tenant yönetimi
│   │   │   └── setup/           # Sistem kurulumu
│   │   └── store/               # Store API'leri (public)
│   │       ├── ayna/            # AI chat store endpoint
│   │       ├── wishlist/        # İstek listesi
│   │       └── tenant/          # Tenant-specific endpoints
│   ├── modules/                  # Özel Modüller
│   │   ├── ayna/                # 🤖 AI Chat Agent
│   │   ├── tenant/              # 🏢 Multi-Tenancy Modülü
│   │   ├── content_engine/      # 📝 Blog/CMS Sistemi
│   │   ├── conscience/          # ⚖️ Vicdan Filtresi
│   │   ├── wishlist/            # ❤️ İstek Listesi
│   │   ├── subscription/        # 🔄 Abonelik (BETA)
│   │   └── loyalty/             # 🏆 Sadakat Programı (BETA)
│   ├── workflows/               # İş Akışları (Saga Pattern)
│   ├── links/                   # Cross-Module Entity Linkleri
│   ├── providers/               # 🔌 Entegrasyon Sağlayıcıları
│   ├── middlewares/             # API Middleware'ler
│   ├── subscribers/             # Event-Driven Handler'lar
│   ├── jobs/                    # Scheduled Background Jobs
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
│   └── next.config.js
│
├── docs/                         # Dokümantasyon
│   └── GENESIS_PROTOCOL/        # Mimari Protokol
│
├── n8n/                          # N8N workflow otomasyonu
│   ├── workflows/               # AI validation workflows
│   └── sql-templates/           # SQL grounding templates
│
├── docker/                       # Docker yapılandırması
├── docker-compose.yml            # Docker Konfigürasyonu
├── medusa-config.ts              # Medusa Ayarları
└── .env                          # Environment Değişkenleri
```

---

## 🏗️ Mimari Genel Bakış

### Multi-Tenant SaaS Mimarisi

Platform, **çoklu mağaza (multi-tenant)** desteği ile her mağazanın verilerini tamamen izole eder:

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT A                 TENANT B         │
│              (Aqua Havuz Antalya)    (Aqua Havuz İzmir)     │
│                  tenant_id: uuid_a       tenant_id: uuid_b   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TENANT ISOLATION LAYERS (4 Katman)              │
│  1. Tenant Context Middleware (Fail-Closed)                  │
│  2. AsyncLocalStorage Propagation                            │
│  3. Database Guard (Awilix Scope)                            │
│  4. Row Level Security (RLS) Global Filter                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MEDUSA SERVER (API)                       │
│                    http://localhost:9000                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   Ayna   │  │  Tenant  │  │ Conscience│  │  Manual  │    │
│  │  Agent   │  │  Module  │  │  Filter   │  │ Payment  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌───────────────────────────────────────────────────────────┐
│                     MEDUSA WORKER                          │
│              Arka Plan İşleri (Workflows)                  │
└───────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Redis     │    │ Meilisearch  │
│   (pgvector) │    │   (Cache)    │    │  (Search)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

### n8n AI Orchestration

LLM çağrıları n8n üzerinden SQL grounding ve validation loop ile işlenir:

```
Storefront → /api/chat → N8nBridge → n8n Webhook
                                    │
                                    ▼
                            ┌───────────────┐
                            │ 1. Intent     │
                            │ 2. SQL Ground │
                            │ 3. AI Agent   │
                            │ 4. Validate   │
                            │ 5. Retry Loop │
                            └───────────────┘
                                    │
                                    ▼
                            Hallucination-Free Response
```

---

## 🔧 Teknoloji Stack

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Backend | Medusa v2 | 2.13.4 |
| Frontend | Next.js | 15.x |
| Database | PostgreSQL + pgvector | 15 |
| Cache | Redis | Alpine |
| Search | Meilisearch | 1.13 |
| AI | Google Gemini | 1.5-flash |
| Container | Docker | Latest |

---

## 📚 Dokümantasyon

| Doküman | Açıklama |
|---------|----------|
| [00_SUPREME_LAW](docs/GENESIS_PROTOCOL/00_SUPREME_LAW.md) | Temel mimari kurallar |
| [01_PROJECT_BIBLE](docs/GENESIS_PROTOCOL/01_PROJECT_BIBLE.md) | Proje vizyonu |
| [02_INSTALLATION_GUIDE](docs/GENESIS_PROTOCOL/02_INSTALLATION_GUIDE.md) | Kurulum rehberi |
| [03_API_REFERENCE](docs/GENESIS_PROTOCOL/03_API_REFERENCE.md) | API endpoint'leri |
| [04_MODULE_GUIDE](docs/GENESIS_PROTOCOL/04_MODULE_GUIDE.md) | Modül açıklamaları |
| [05_AI_INTEGRATION_GUIDE](docs/GENESIS_PROTOCOL/05_AI_INTEGRATION_GUIDE.md) | Gemini entegrasyonu |
| [06_AYNA_AI_CORE](docs/GENESIS_PROTOCOL/06_AYNA_AI_CORE.md) | Ayna AI Çekirdek ve Teknik Kılavuz |

| [10_MASTER_ARCHITECT_MANUAL](docs/GENESIS_PROTOCOL/10_MASTER_ARCHITECT_MANUAL.md) | Genel mimari rehber |
| [11_PROVIDER_GUIDE](docs/GENESIS_PROTOCOL/11_PROVIDER_GUIDE.md) | Harici servis sağlayıcıları (PayTR, Brevo, vb.) |

---

## 🔑 Environment Değişkenleri

```env
# Veritabanı
DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa-genesis

# AI
GEMINI_API_KEY=your_api_key
GEMINI_MODEL_NAME=gemini-1.5-flash

# Yedek AI (Fallback Katmanı)
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL_NAME=llama3

# n8n AI Orchestration
N8N_BRIDGE_ENABLED=false
N8N_WEBHOOK_URL=http://n8n:5678
N8N_CHAT_WEBHOOK_PATH=/webhook/ayna-grounded-chat
N8N_TIMEOUT_MS=30000

# Arama
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_MASTER_KEY=masterKey123

# JWT & Security (Production'da güçlü değerler kullanın!)
JWT_SECRET=your_strong_jwt_secret
COOKIE_SECRET=your_strong_cookie_secret

# CORS
STORE_CORS=http://localhost:8000,http://localhost:3000
ADMIN_CORS=http://localhost:9000,http://localhost:5173
AUTH_CORS=http://localhost:9000,http://localhost:8000
```

---

## 🤖 Ayna AI Agent

Ayna, müşterilere yardımcı olan yapay zeka asistanıdır.

**Yetenekleri:**
- 🔍 Ürün arama (`search_products`)
- 📊 Stok kontrolü (`check_inventory`)
- 🧮 Teknik hesaplamalar (`calculatePoolChemicals`)
- 📝 Blog yazısı oluşturma (`create_blog_post`)
- 🏭 Otonom Mağaza Kurulumu (`generate_storefront_data` - Bloom Mimarisi)
- ⚖️ Vicdan filtresi (`conscience_check`)
- 🧠 Hafıza Özetleme (`memory_summarization` - Asenkron Profil Çıkarımı)
- 🛡️ Yıkılmazlık Katmanı (`fallback_ai` - Gemini 500/429 Hatalarında Ollama Yedekleme)
- 🔒 Stabilite & Güvenlik (Kurşun Geçirmez Zod Endpoint Doğrulaması, remoteQuery modül izolasyonu, professional mock providers)

**API Endpoint:**
```
POST /store/ayna/chat
Body: { "message": "Merhaba, havuz için klor lazım" }
```

---

## 🏛️ Mimari Kararlar (ADR)

1. **Modül İzolasyonu:** Tüm modüller arası iletişim `remoteQuery` veya açık dependency injection ile yapılır. `(container as any)` kullanımı yasaktır.
2. **Provider Güvenliği:** Ödeme sağlayıcıları gerçek istemci IP'sini kullanmalıdır.
3. **Mock Yönetimi:** Dış servisler için `USE_MOCK_PROVIDERS` ile kontrollü test ortamı sağlanır.


## 📝 Lisans

MIT License - Ticari kullanıma açık.
