# GENESIS PROTOCOL: PROVIDER GUIDE (11)
> **Author:** Antigravity  
> **Last Updated:** 2026-03-15  
> **Status:** STABLE

Bu doküman, PROJECT-AYNA-GENESIS'te kullanılan harici servis sağlayıcılarını (Providers) ve konfigürasyonlarını açıklar.

---

## 🔌 Entegrasyon Sağlayıcıları

| Sağlayıcı | Tür | Servis | Konfigürasyon Dosyası |
|-----------|-----|--------|-----------------------|
| **PayTR** | Ödeme | Ödeme Geçidi | `src/providers/paytr` |
| **Iyzico** | Ödeme | Ödeme Geçidi | `src/providers/iyzico` |
| **Brevo** | Bildirim | E-posta (SMTP/API) | `src/providers/brevo` |
| **Cloudinary** | Dosya | Resim/Dosya Depolama | `src/providers/cloudinary` |
| **Yurtiçi Kargo** | Lojistik | Kargo Takip/Etiket | `src/providers/yurtici` |
| **Manual** | Ödeme | Nakit/Havale | `src/providers/manual` |

---

## 🛠️ Detaylı Konfigürasyon

### 1. Ödeme Sağlayıcıları (Payment)
Medusa v2'de ödeme sağlayıcıları `metusa-config.ts` içindeki `payment` modülü altında tanımlanır.

#### PayTR & Iyzico
`.env` dosyasındaki şu değişkenler gereklidir:
```env
PAYTR_MERCHANT_ID=xxx
PAYTR_MERCHANT_KEY=xxx
PAYTR_MERCHANT_SALT=xxx

IYZICO_API_KEY=xxx
IYZICO_SECRET_KEY=xxx
IYZICO_BASE_URL=https://api.iyzipay.com
```

### 2. Bildirim Sağlayıcıları (Notification)
#### Brevo
E-posta gönderimi için kullanılır.
```env
BREVO_API_KEY=xxx
BREVO_FROM_EMAIL=donotreply@aquahavuz.com
BREVO_FROM_NAME="Aqua Havuz"
```

### 3. Dosya Depolama (File)
#### Cloudinary
Ürün resimleri ve medya dosyaları için kullanılır.
```env
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

### 4. Lojistik (Fulfillment)
#### Yurtiçi Kargo
- **Mock Modu:** `.env` dosyasında `USE_MOCK_PROVIDERS=true` ayarlandığında `MOCK-YT-{timestamp}` formatında takip numarası üretir.
- **Production Modu:** `USE_MOCK_PROVIDERS=false` veya tanımlı olmadığında gerçek API çağrısı yapar.

```env
YURTICI_API_KEY=xxx
YURTICI_API_SECRET=xxx
USE_MOCK_PROVIDERS=true  # Test için true, canlı için false
```

---

## 🔒 Güvenlik ve IP Yönetimi

Genesis Protocol v2.1 uyarınca, ödeme sağlayıcılarına (PayTR, Iyzico) iletilen `user_ip` bilgisi artık `src/utils/get-client-ip.ts` yardımcı fonksiyonu ile dinamik olarak çekilir.

Bu fonksiyon sırasıyla:
1. `x-forwarded-for` (proxy zincirinin ilk IP'si)
2. `x-real-ip`
3. `cf-connecting-ip`
4. Fallback: `127.0.0.1`

değerlerini kontrol eder. Bu sayede ödemelerin fraud filtrelerine takılması engellenmiş olur.

## 🧪 Test Etme
Her bir sağlayıcının kendi test endpoint'i veya script'i mevcuttur.
Örn: `src/api/admin/test-brevo/route.ts`
