# 📖 API EXAMPLES & RECIPES - API Kullanım Örnekleri ve Tarifler

> **"Pratik örnekler, teorik bilgiden daha değerlidir."**

Bu rehber, PROJECT-AYNA-GENESIS API'lerini kullanmak için hazır örnekler ve tarifler içerir.

---

## 📋 İçindekiler

1. [Temel Yapılandırma](#temel-yapılandırma)
2. [Ürün İşlemleri](#ürün-işlemleri)
3. [Ayna AI Chat](#ayna-ai-chat)
4. [Sepet ve Sipariş](#sepet-ve-sipariş)
5. [Müşteri İşlemleri](#müşteri-işlemleri)
6. [Tenant Yönetimi](#tenant-yönetimi)
7. [Wishlist İşlemleri](#wishlist-işlemleri)
8. [Ödeme İşlemleri](#ödeme-işlemleri)
9. [İleri Seviye Örnekler](#ileri-seviye-örnekler)

---

## 🔧 Temel Yapılandırma

### API Base URL

```bash
# Production
BASE_URL=https://api.aynahavuz.com

# Development
BASE_URL=http://localhost:9000
```

### Authentication Headers

```bash
# Store API (Public/Publishable Key)
curl -H "x-publishable-api-key: pub_1234567890" ...

# Admin API (JWT Token)
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ...

# Customer Auth (Store)
curl -H "Authorization: Bearer customer_token_123" ...
```

---

## 🛍️ Ürün İşlemleri

### 1. Tüm Ürünleri Listele

```bash
curl -X GET "http://localhost:9000/store/products" \
  -H "x-publishable-api-key: pub_123"
```

**Yanıt:**
```json
{
  "products": [
    {
      "id": "prod_01HXYZ123",
      "title": "Klor Tablet 5kg",
      "handle": "klor-tablet-5kg",
      "description": "Havuz suyu için hızlı çözünen klor tableti",
      "thumbnail": "https://cdn.example.com/klor-tablet.jpg",
      "variants": [
        {
          "id": "variant_01HXYZ456",
          "title": "5kg",
          "prices": [
            {
              "amount": 45000,
              "currency_code": "TRY"
            }
          ]
        }
      ]
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 50
}
```

### 2. Ürün Arama (Meilisearch ile)

```bash
curl -X POST "http://localhost:7700/indexes/products/search" \
  -H "Authorization: Bearer masterKey" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "klor",
    "limit": 10,
    "filter": ["price < 100000"]
  }'
```

### 3. Kategoriye Göre Ürün Filtreleme

```bash
curl -X GET "http://localhost:9000/store/products?collection_id=col_123" \
  -H "x-publishable-api-key: pub_123"
```

### 4. Ürün Detayını Getir

```bash
curl -X GET "http://localhost:9000/store/products/prod_01HXYZ123" \
  -H "x-publishable-api-key: pub_123"
```

---

## 🤖 Ayna AI Chat

### 1. Mağaza AI Chat (Müşteri)

```bash
curl -X POST "http://localhost:9000/store/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -H "Authorization: Bearer customer_token_123" \
  -d '{
    "message": "Havuzum 50 ton su alıyor, kaç kg klor tablet almalıyım?",
    "context": {
      "poolVolume": 50,
      "poolType": "beton"
    }
  }'
```

**Yanıt:**
```json
{
  "response": "50 ton (50.000 litre) su için başlangıç dozajı olarak 500 gram klor tablet öneriyorum. Bu, 10 ton başına 100 gram standart dozajdır.",
  "tools_used": ["calculatePoolChemicals"],
  "memory_updated": true,
  "customer_id": "cust_123"
}
```

### 2. Admin AI Chat (Tüm Araçlar Açık)

```bash
curl -X POST "http://localhost:9000/admin/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "message": "Bu ay en çok satan ürünleri analiz et ve yeni bir kampanya öner",
    "isAdmin": true
  }'
```

**Yanıt:**
```json
{
  "response": "Bu ay en çok satan ürünler: 1) Klor Tablet 5kg (245 adet), 2) pH Düşürücü (180 adet). Öneri: Klor tableti alan müşterilere pH düşürücü %20 indirimli kampanyası düzenleyelim.",
  "tools_used": ["predict_stock_shortage", "create_campaign"],
  "campaign_created": "camp_01HXYZ789"
}
```

### 3. AI ile Ürün Önerisi

```bash
curl -X POST "http://localhost:9000/store/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "message": "Havuz bakımı için temel ürünleri öner",
    "context": {
      "isBeginner": true,
      "poolSize": "orta"
    }
  }'
```

---

## 🛒 Sepet ve Sipariş

### 1. Sepet Oluştur

```bash
curl -X POST "http://localhost:9000/store/carts" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "region_id": "reg_123",
    "items": [
      {
        "variant_id": "variant_01HXYZ456",
        "quantity": 2
      }
    ]
  }'
```

### 2. Sepete Ürün Ekle

```bash
curl -X POST "http://localhost:9000/store/carts/cart_01HXYZ789/line-items" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "variant_id": "variant_01HXYZ456",
    "quantity": 1
  }'
```

### 3. Sepeti Tamamla ve Sipariş Oluştur

```bash
# 1. Müşteri bilgilerini ekle
curl -X POST "http://localhost:9000/store/carts/cart_01HXYZ789" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "email": "musteri@example.com",
    "billing_address": {
      "first_name": "Ahmet",
      "last_name": "Yılmaz",
      "address_1": "Atatürk Cad. No:123",
      "city": "İstanbul",
      "postal_code": "34000",
      "country_code": "TR"
    }
  }'

# 2. Ödeme yöntemini seç
curl -X POST "http://localhost:9000/store/carts/cart_01HXYZ789/payment-sessions" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "provider_id": "paytr"
  }'

# 3. Siparişi tamamla
curl -X POST "http://localhost:9000/store/carts/cart_01HXYZ789/complete" \
  -H "x-publishable-api-key: pub_123"
```

### 4. Sipariş Durumunu Takip Et

```bash
curl -X GET "http://localhost:9000/store/orders/order_01HXYZ999" \
  -H "x-publishable-api-key: pub_123"
```

---

## 👤 Müşteri İşlemleri

### 1. Müşteri Kaydı

```bash
curl -X POST "http://localhost:9000/store/customers" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "first_name": "Ayşe",
    "last_name": "Demir",
    "email": "ayse@example.com",
    "password": "guvenli_sifre_123"
  }'
```

### 2. Müşteri Girişi

```bash
curl -X POST "http://localhost:9000/store/auth" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "email": "ayse@example.com",
    "password": "guvenli_sifre_123"
  }'
```

**Yanıt:**
```json
{
  "customer": {
    "id": "cust_01HXYZ123",
    "email": "ayse@example.com",
    "first_name": "Ayşe",
    "last_name": "Demir"
  },
  "token": "customer_jwt_token_abc123"
}
```

### 3. Müşteri Profilini Güncelle

```bash
curl -X POST "http://localhost:9000/store/customers" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -H "Authorization: Bearer customer_jwt_token_abc123" \
  -d '{
    "phone": "+905551234567",
    "company": "Aqua Havuz A.Ş."
  }'
```

---

## 🏢 Tenant Yönetimi

### 1. Yeni Tenant Oluştur (Admin)

```bash
curl -X POST "http://localhost:9000/admin/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "name": "Aqua Havuz İstanbul",
    "slug": "aqua-istanbul",
    "sector": "pool_supplies",
    "settings": {
      "currency": "TRY",
      "language": "tr",
      "timezone": "Europe/Istanbul"
    }
  }'
```

### 2. Tenant Listesini Getir (Admin)

```bash
curl -X GET "http://localhost:9000/admin/tenants" \
  -H "Authorization: Bearer admin_token_456"
```

### 3. Tenant Detayını Getir (Admin)

```bash
curl -X GET "http://localhost:9000/admin/tenants/tenant_01HXYZ123" \
  -H "Authorization: Bearer admin_token_456"
```

### 4. Tenant İstatistikleri (Admin)

```bash
curl -X GET "http://localhost:9000/admin/tenants/tenant_01HXYZ123/stats" \
  -H "Authorization: Bearer admin_token_456"
```

**Yanıt:**
```json
{
  "total_products": 150,
  "total_orders": 45,
  "total_customers": 120,
  "monthly_revenue": 125000,
  "top_selling_products": [
    {
      "id": "prod_01HXYZ456",
      "title": "Klor Tablet 5kg",
      "sales_count": 25
    }
  ]
}
```

---

## ❤️ Wishlist İşlemleri

### 1. Wishlist'e Ürün Ekle (Müşteri)

```bash
curl -X POST "http://localhost:9000/store/wishlist" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -H "Authorization: Bearer customer_token_123" \
  -d '{
    "product_id": "prod_01HXYZ456",
    "variant_id": "variant_01HXYZ789",
    "notify_on_restock": true
  }'
```

### 2. Wishlist Listesini Getir (Müşteri)

```bash
curl -X GET "http://localhost:9000/store/wishlist" \
  -H "x-publishable-api-key: pub_123" \
  -H "Authorization: Bearer customer_token_123"
```

### 3. Wishlist'den Ürün Çıkar (Müşteri)

```bash
curl -X DELETE "http://localhost:9000/store/wishlist/wishlist_item_01HXYZ123" \
  -H "x-publishable-api-key: pub_123" \
  -H "Authorization: Bearer customer_token_123"
```

### 4. Stok Bildirimi Gönder (Admin)

```bash
curl -X POST "http://localhost:9000/admin/wishlist/restock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "product_id": "prod_01HXYZ456",
    "variant_id": "variant_01HXYZ789"
  }'
```

---

## 💳 Ödeme İşlemleri

### 1. PayTR Ödeme Formu Oluştur

```bash
curl -X POST "http://localhost:9000/store/payment/paytr/session" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "cart_id": "cart_01HXYZ789",
    "customer": {
      "id": "cust_01HXYZ123",
      "email": "musteri@example.com",
      "name": "Ahmet Yılmaz"
    },
    "amount": 45000,
    "currency": "TRY"
  }'
```

**Yanıt:**
```json
{
  "paytr_token": "paytr_token_abc123",
  "iframe_url": "https://www.paytr.com/odeme/formu?token=paytr_token_abc123"
}
```

### 2. Ödeme Sonucunu Kontrol Et

```bash
curl -X GET "http://localhost:9000/store/payment/paytr/result?token=paytr_result_token" \
  -H "x-publishable-api-key: pub_123"
```

---

## 🚀 İleri Seviye Örnekler

### 1. AI Destekli Ürün Arama

```bash
# 1. Önce AI'dan arama önerisi al
curl -X POST "http://localhost:9000/store/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: pub_123" \
  -d '{
    "message": "Havuz suyu için temizlik ürünleri arıyorum"
  }'

# Yanıt: "pH düzenleyiciler, klor tabletler ve yosun önleyiciler öneriyorum"

# 2. AI önerisine göre ürünleri ara
curl -X GET "http://localhost:9000/store/products?title=klor" \
  -H "x-publishable-api-key: pub_123"
```

### 2. Otomatik Stok Yönetimi

```bash
# AI'nın stok tahmini yapmasını iste
curl -X POST "http://localhost:9000/admin/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "message": "Önümüzdeki ay için stok tahmini yap",
    "isAdmin": true
  }'

# AI otomatik olarak predict_stock_shortage tool'unu kullanacak
# ve düşük stok uyarıları oluşturacak
```

### 3. Çoklu Tenant Ürün Senkronizasyonu

```bash
# 1. Ana tenant'taki ürünü al
curl -X GET "http://localhost:9000/admin/products/prod_01HXYZ123" \
  -H "Authorization: Bearer admin_token_456"

# 2. Ürünü diğer tenant'lara kopyala
curl -X POST "http://localhost:9000/admin/tenants/tenant_01HXYZ456/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "source_product_id": "prod_01HXYZ123",
    "pricing_rules": {
      "markup_percentage": 10
    }
  }'
```

### 4. AI Destekli İçerik Üretimi

```bash
# Blog yazısı oluştur
curl -X POST "http://localhost:9000/admin/ayna/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_456" \
  -d '{
    "message": "Havuz bakımı için yaz rehberi blog yazısı oluştur",
    "isAdmin": true
  }'

# AI create_blog_post tool'unu kullanarak otomatik olarak:
# 1. SEO uyumlu içerik oluşturur
# 2. Görsel önerileri ekler
# 3. İlgili ürünleri link'ler
```

---

## 📊 Hata Kodları ve Anlamları

| HTTP Kodu | Anlam | Olası Çözüm |
|-----------|-------|-------------|
| `200` | Başarılı | - |
| `201` | Oluşturuldu | - |
| `400` | Hatalı İstek | Request body'yi kontrol et |
| `401` | Yetkisiz | Token'ı kontrol et |
| `403` | Yasak | İzinleri kontrol et |
| `404` | Bulunamadı | URL'yi kontrol et |
| `429` | Rate Limit | Biraz bekle |
| `500` | Sunucu Hatası | Logları kontrol et |

---

## 🔑 En İyi Uygulamalar

### 1. Rate Limiting

```bash
# Ayna AI endpoint'leri için rate limit:
# Store: 20 istek/dakika
# Admin: 10 istek/dakika

# Rate limit header'larını kontrol et:
curl -I "http://localhost:9000/store/ayna/chat"
# X-RateLimit-Limit: 20
# X-RateLimit-Remaining: 19
# X-RateLimit-Reset: 1620000000
```

### 2. Error Handling

```javascript
// JavaScript örneği
async function callAynaAPI(message) {
  try {
    const response = await fetch('http://localhost:9000/store/ayna/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': 'pub_123'
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit aşıldı, lütfen bekleyin');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API hatası:', error);
    throw error;
  }
}
```

### 3. Pagination

```bash
# Sayfalama parametreleri
curl -X GET "http://localhost:9000/store/products?limit=10&offset=20" \
  -H "x-publishable-api-key: pub_123"

# Yanıt header'larında pagination bilgisi:
# Link: <https://api.example.com/products?limit=10&offset=30>; rel="next"
# Link: <https://api.example.com/products?limit=10&offset=0>; rel="prev"
```

---

## 📞 Yardım ve Destek

- **API Dokümantasyonu:** `docs/GENESIS_PROTOCOL/03_API_REFERENCE.md`
- **Sorun Giderme:** `docs/GENESIS_PROTOCOL/16_TROUBLESHOOTING_GUIDE.md`
- **GitHub Issues:** [github.com/aynagenesis/platform/issues](https://github.com/aynagenesis/platform/issues)

---

**Not:** Bu örnekler development ortamı içindir. Production'da HTTPS ve güvenli authentication kullanın!