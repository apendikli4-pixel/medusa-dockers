# n8n — Hallucination Killer (Grounding Layer)

Bu dizin, n8n'in Medusa v2 veritabanına bağlanarak AI ajanlarına **gerçek veri (ground truth)** sağlamasını organize eder.

## Mimari

```
┌──────────────┐     SQL Queries      ┌───────────────────┐
│   n8n        │ ──────────────────►  │  PostgreSQL       │
│   AI Agent   │                      │  (medusa-genesis) │
│   Node       │ ◄────────────────    │                   │
│              │   Real DB Context    └───────────────────┘
│              │                      
│   + Gemini   │ ──► Grounded Answer  ┌───────────────────┐
│   Sub-node   │                      │  Medusa Server    │
│              │ ◄──────────────────  │  REST API :9000   │
└──────────────┘   HTTP (fallback)    └───────────────────┘
```

### Akış

1. Kullanıcı mesajı n8n webhook/chat trigger'ına gelir
2. **Extraction Node** mesajdan anahtar kelimeleri / intent'i çıkarır
3. **SQL Query Node** Medusa veritabanına bağlanarak gerçek veri çeker
4. **Context Builder** SQL sonuçlarını yapılandırılmış prompt'a dönüştürür
5. **AI Agent Node** Gemini'ye "grounded context + user question" gönderir
6. Gemini yalnızca bu veriye dayanarak cevap üretir — hallucination engellenmiş olur

## Dosya Yapısı

```
n8n/
├── README.md                          ← Bu dosya
├── sql-templates/
│   ├── 01-products.sql                ← Ürün kataloğu sorguları
│   ├── 02-inventory.sql               ← Stok durumu sorguları
│   ├── 03-orders.sql                  ← Sipariş sorguları
│   ├── 04-customers.sql               ← Müşteri profil sorguları
│   └── 05-composite-context.sql       ← Tek sorguda full context
└── workflows/
    └── hallucination-killer-agent.json ← n8n workflow import dosyası
```

## n8n Credential Kurulumu

### PostgreSQL Credential

n8n UI'da **Settings → Credentials → Add Credential → Postgres** ile oluştur:

| Alan | Değer |
|------|-------|
| Host | `postgres` (Docker ağ adı) |
| Port | `5432` |
| Database | `medusa-genesis` |
| User | `postgres` |
| Password | `postgres` |
| SSL | Disabled (aynı Docker ağı) |

> **NOT:** n8n kendi veritabanı olarak `n8n` DB'sini kullanır. Medusa'nın verisini **okumak** için `medusa-genesis` DB'sine ayrı bir credential tanımlanmalıdır.

### HTTP Header Auth (Medusa API fallback)

| Alan | Değer |
|------|-------|
| Name | `x-publishable-api-key` |
| Value | `.env` dosyasındaki `PUBLISHABLE_API_KEY` |
