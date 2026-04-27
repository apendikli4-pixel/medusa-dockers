# GENESIS PROTOCOL: API REFERENCE (03)
> **Author:** Antigravity / Mirror Core  
> **Last Updated:** 2026-03-24  
> **Status:** STABLE

Bu doküman, PROJECT-AYNA-GENESIS'in tüm API endpoint'lerini kapsar.

---

## 🌐 Base URLs

| Ortam | URL |
|-------|-----|
| Development | `http://localhost:9000` |
| Storefront | `http://localhost:8000` |

---

## 🔐 Authentication

### Admin API
```http
Authorization: Bearer <admin_token>
```

### Store API
```http
x-publishable-api-key: <publishable_key>
```

### Store API (Customer-protected routes)
Wishlist gibi route'lar müşteri kimliği gerektirir:

```http
Authorization: Bearer <customer_token>
x-publishable-api-key: <publishable_key>
```

---

## 📦 Store API Endpoints

### Ayna AI Chat
Yapay zeka asistanı ile konuşma.

```http
POST /store/ayna/chat
```

**Headers:**
```
Content-Type: application/json
x-publishable-api-key: pk_xxx
```

**Request Body:**
```json
{
  "message": "Havuz temizliği için ne önerirsin?",
  "customerId": "cus_xxx" // Opsiyonel
}
```

**Response:**
```json
{
  "response": "Havuz temizliği için...",
  "debug": {
    "model": "gemini-1.5-flash",
    "tool_used": true,
    "iterations": 2,
    "customerGroup": "B2C_Retail"
  }
}
```

---

### Havuz Mühendisi Ajanı
Teknik hesaplamalar ve havuz ölçümü için odaklanmış asistan.

```http
POST /store/pool-agent
```

**Body:**
```json
{
  "message": "Havuzum 5x10, derinlik 1.5m. Ne kadar klor lazım?",
  "customerId": "cus_xxx"
}
```

---

### Ürün Arama
```http
GET /store/products?q=klor&limit=10
```

**Query Parameters:**
| Param | Tip | Açıklama |
|-------|-----|----------|
| q | string | Arama kelimesi |
| limit | number | Sonuç limiti |
| offset | number | Sayfalama offset |
| category_id | string | Kategori filtresi |

---

### Wishlist (Store)

#### Listele
```http
GET /store/wishlist
```

**Auth:** Customer session/bearer zorunlu.

**Response (200):**
```json
{
  "items": [
    {
      "id": "wli_xxx",
      "customer_id": "cus_xxx",
      "product_id": "prod_xxx",
      "notify_on_restock": true,
      "restock_notified_at": null
    }
  ]
}
```

#### Ekle / Güncelle (Upsert)
```http
POST /store/wishlist
```

**Body:**
```json
{
  "product_id": "prod_xxx",
  "notify_on_restock": true
}
```

**Response (200):**
```json
{
  "item": {
    "id": "wli_xxx",
    "customer_id": "cus_xxx",
    "product_id": "prod_xxx",
    "notify_on_restock": true,
    "restock_notified_at": null
  }
}
```

#### Sil
```http
DELETE /store/wishlist/:itemId
```

**Response (200):**
```json
{
  "success": true
}
```

---

## 🔧 Admin API Endpoints

### Blog Post İşlemleri

#### Liste
```http
GET /admin/posts
```

#### Tek Post
```http
GET /admin/posts/:id
```

#### Oluştur
```http
POST /admin/posts
```

**Body:**
```json
{
  "title": "Blog Başlığı",
  "slug": "blog-basligi",
  "content": "<p>İçerik...</p>",
  "status": "draft",
  "image": "https://...",
  "author": "Yazar Adı",
  "excerpt": "Kısa açıklama",
  "seo_title": "SEO Başlığı",
  "seo_description": "SEO Açıklaması"
}
```

#### Güncelle
```http
PUT /admin/posts/:id
```

#### Sil
```http
DELETE /admin/posts/:id
```

---

### Admin Ayna AI (Yönetici Zihni)

Bu endpoint, sadece yetkili (Admin) sistem yöneticisinin, komuta tarzında sınırsız AI gücüne (Tüm toollar açık) erişmesini sağlar.

```http
POST /admin/ayna/chat
```

> 🔒 Rate limit: **10 istek/dakika**  
> ✅ Zod validasyonu aktif — `message` zorunlu, max 4000 karakter

**Body:**
```json
{
  "message": "Apple kulaklık stoklarını sıfırla ve durumu bana raporla."
}
```

**Response — Başarılı:**
```json
{
  "response": "[Admin Komutu Sonucu] İlgili ürün stokları 0 olarak güncellenmiştir.",
  "debug": {
    "model": "gemini-1.5-flash",
    "tool_used": true,
    "admin_mode": true
  }
}
```

**Response — Geçersiz İstek (400):**
```json
{
  "error": "Geçersiz istek",
  "details": [{ "code": "too_small", "path": ["message"], "message": "Mesaj boş olamaz" }]
}
```

> ⚠️ Hata durumunda `stack` veya `details` içinde dahili bilgi dönmez.

---

### Wishlist Restock Bildirimi (Admin)

Stok geri geldiğinde wishlist kullanıcılarına e-posta bildirimini tetikler.

```http
POST /admin/wishlist/restock
```

**Body:**
```json
{
  "product_id": "prod_xxx"
}
```

**Response (200):**
```json
{
  "success": true,
  "product_id": "prod_xxx",
  "notified_count": 12
}
```

---

### AI Missions (Peak 2.0)

Asistan tarafından oluşturulan otonom görevlerin listelenmesi.

```http
GET /admin/missions
```

**Response:**
```json
{
  "missions": [
    {
      "id": "miss_xxx",
      "title": "Stok Güncelleme",
      "status": "pending",
      "priority": "high",
      "result": { "productId": "...", "value": 50 }
    }
  ]
}
```

---

### System Health Stats (Peak 2.0)

Gelişmiş observability ve AI performans metrikleri.

```http
GET /admin/system-health/stats
```

**Response:**
```json
{
  "stats": {
    "usage_count": 150,
    "success_rate": 98.5,
    "avoided_loss": 5000,
    "active_missions": 3
  }
}
```

---

### AI Content Generation

```http
POST /admin/generate-content
```

**Body:**
```json
{
  "prompt": "Havuz bakımı hakkında bir blog yazısı yaz"
}
```

**Response:**
```json
{
  "result": "{\"title\": \"...\", \"content\": \"...\"}"
}
```

---

### Gemini API Key (Internal)

```http
GET /admin/gemini
```

**Response:**
```json
{
  "apiKey": "AIzaSy..."
}
```

> ⚠️ Bu endpoint sadece dahili kullanım içindir.

---

## 🔍 Hybrid Search API

### Meilisearch Endpoint
```http
POST /store/search
```

**Body:**
```json
{
  "q": "klor",
  "limit": 20
}
```

---

## 📊 Rate Limiting

| Endpoint | Limit | Not |
|----------|-------|-----|
| `POST /admin/ayna/chat` | **10 istek/dakika** | 2026-03-24 eklendi |
| `POST /store/ayna/chat` | **20 istek/dakika** | 2026-03-24 eklendi |
| `POST /admin/generate-content` | 5 istek/dakika | — |
| Diğer | 100 istek/dakika | — |

---

## ❌ Error Responses

### 400 Bad Request — Validasyon Hatası (Zod)
```json
{
  "error": "Geçersiz istek",
  "details": [
    { "code": "too_small", "path": ["message"], "message": "Mesaj boş olamaz" }
  ]
}
```

### 400 Bad Request — Eksik Alan
```json
{
  "error": "Title, slug, and content are required fields."
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Post not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please wait."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## 🧪 Test Komutları

```bash
# Ayna ile konuş
curl -X POST http://localhost:9000/store/ayna/chat \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pk_xxx" \
  -d '{"message": "Merhaba"}'

# Blog post oluştur
curl -X POST http://localhost:9000/admin/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Test", "slug": "test", "content": "<p>İçerik</p>"}'

# Wishlist'e ürün ekle
curl -X POST http://localhost:9000/store/wishlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_token>" \
  -H "x-publishable-api-key: pk_xxx" \
  -d '{"product_id": "prod_xxx", "notify_on_restock": true}'

# Admin restock bildirimi tetikle
curl -X POST http://localhost:9000/admin/wishlist/restock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"product_id": "prod_xxx"}'
```
