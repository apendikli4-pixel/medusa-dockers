# 📋 AYNA GENESIS - Değişiklik Günlüğü (Changelog)

---

## [2026-02-06] Mimari İyileştirmeler v1.0

### 🎯 Özet
5 kritik mimari iyileştirme Medusa v2 standartlarına uygun olarak implement edildi.

---

### 1️⃣ ContentCreatorTool AI Entegrasyonu

**Amaç:** Ayna AI'ın chat üzerinden blog yazısı oluşturabilmesi

**Değişiklikler:**
- `src/modules/ayna/service.ts` - ContentCreatorTool tools dizisine eklendi
  - Tool initialization
  - Gemini function declarations
  - Tool execution logic

**Kullanım:**
```
Kullanıcı: "Havuz bakımı hakkında bir blog yazısı oluştur"
Ayna: [ContentCreatorTool çağırır, post oluşturur]
```

---

### 2️⃣ TypeScript Interface Tanımları

**Amaç:** Type safety sağlamak, "any" kullanımını azaltmak

**Yeni Dosyalar:**
| Dosya | İçerik |
|-------|--------|
| `src/types/content-engine.ts` | Post, CreatePostInput, UpdatePostInput, IContentEngineService |
| `src/types/ayna.ts` | MemoryTruth, MemoryInsight, IAynaTool, IAynaService |
| `src/types/modules.ts` | MODULES constant (typo önleme) |
| `src/types/index.ts` | Central export |

**Güncellenen Dosyalar:**
- `src/api/admin/posts/route.ts` - Typed service resolution

---

### 3️⃣ Post Model SEO Alanları

**Amaç:** Blog postlarının SEO performansını artırmak

**Yeni Alanlar:**
| Alan | Tip | Açıklama |
|------|-----|----------|
| `author` | text (nullable) | Yazar adı |
| `excerpt` | text (nullable) | Kısa özet |
| `seo_title` | text (nullable) | Meta title |
| `seo_description` | text (nullable) | Meta description |
| `view_count` | number (default: 0) | Görüntülenme sayısı |

**Güncellenen Dosyalar:**
- `src/modules/content_engine/models/post.ts`
- `src/types/content-engine.ts`
- `storefront/src/lib/data/posts.ts`

---

### 4️⃣ Rate Limiting (Hız Sınırlama)

**Amaç:** AI endpoint'lerini kötüye kullanımdan korumak

**Yeni Dosya:**
- `src/lib/rate-limiter.ts`

**Limitler:**
| Endpoint | Limit | Açıklama |
|----------|-------|----------|
| `/ayna` | 10 req/dakika | Chat AI |
| `/admin/generate-content` | 5 req/dakika | İçerik üretimi |

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 45
```

**Limit Aşıldığında (HTTP 429):**
```json
{
    "error": "RATE_LIMIT_EXCEEDED",
    "message": "AI isteklerinde hız limiti aşıldı.",
    "retryAfter": 45
}
```

---

### 5️⃣ ISR Cache Stratejisi

**Amaç:** Storefront performansını artırmak

**Konfigürasyon:**
| İçerik | Development | Production |
|--------|-------------|------------|
| Post listesi | no-store | 60 saniye |
| Post detay | no-store | 300 saniye |

**Güncellenen Dosya:**
- `storefront/src/lib/data/posts.ts`

**Yeni Fonksiyonlar:**
- `getFeaturedPosts(limit)` - Ana sayfa için son postlar
- `incrementViewCount(postId)` - Görüntülenme sayacı

---

## 📁 Değişen Dosyaların Tam Listesi

### Yeni Dosyalar (6)
```
src/types/
├── content-engine.ts
├── ayna.ts
├── modules.ts
└── index.ts

src/lib/
└── rate-limiter.ts
```

### Güncellenen Dosyalar (6)
```
src/modules/ayna/service.ts
src/modules/content_engine/models/post.ts
src/api/admin/posts/route.ts
src/api/ayna/route.ts
src/api/admin/generate-content/route.ts
storefront/src/lib/data/posts.ts
```

---

## ⚠️ Önemli Notlar

1. **Database Migration:** Post modeli değiştiği için container restart gerekebilir
   ```bash
   docker-compose restart medusa
   ```

2. **IDE Lint Hataları:** Görünen lint hataları IDE'nin Docker container içindeki node_modules'a erişememesinden kaynaklanıyor. Runtime'da sorun oluşturmaz.

3. **Rate Limiter:** In-memory store kullanıyor. Multi-instance production için Redis'e geçiş önerilir.

---

## 🔗 İlgili Dokümantasyon

- [Mimari Analiz Raporu](../AYNA_ARCHITECTURE_ANALYSIS.md)
- [Genesis Protokolü](./00_SUPREME_LAW.md)
- [Kurulum Rehberi](./02_INSTALLATION_GUIDE.md)

---

## [2026-02-06 v1.1] Ek İyileştirmeler

### 6️⃣ Admin UI SEO Alanları

**Dosya:** `src/admin/routes/posts/create/page.tsx`

**Yeni Form Alanları:**
- Yazar (author)
- Kısa Özet (excerpt)
- SEO Başlığı (seo_title)
- SEO Açıklaması (seo_description)

### 7️⃣ Merkezi Hata Yönetimi

**Yeni Dosya:** `src/lib/error-handler.ts`

**Özellikler:**
- `ServiceError` sınıfı (custom error type)
- `ErrorCode` enum (VALIDATION_ERROR, NOT_FOUND, AI_SERVICE_ERROR vb.)
- `handleError()` - merkezi error handler
- `withErrorHandler()` - API route wrapper
- Türkçe hata mesajları
- Development/Production mode ayrımı

**Kullanım:**
```typescript
import { withErrorHandler, validationError } from "../../lib/error-handler"

export const POST = withErrorHandler(async (req, res) => {
    if (!req.body.title) throw validationError("Başlık gerekli")
    // ...
})
```

### 8️⃣ Production Dockerfile

**Yeni Dosya:** `Dockerfile.production`

**Multi-Stage Build:**
1. **deps** - Sadece dependencies
2. **builder** - Build aşaması
3. **runner** - Minimal production image

**Avantajlar:**
- Daha küçük image boyutu
- Daha iyi caching
- Production-ready

### 9️⃣ API SEO Desteği

**Güncellenen:** `src/api/admin/posts/route.ts`

POST ve PATCH endpoint'leri artık SEO alanlarını kabul ediyor:
- author
- excerpt  
- seo_title
- seo_description

---

*Son Güncelleme: 2026-02-06 00:15 UTC+3*
