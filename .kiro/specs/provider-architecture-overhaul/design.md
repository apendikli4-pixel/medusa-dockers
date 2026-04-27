# Provider Architecture Overhaul — Bugfix Tasarım Belgesi

## Genel Bakış

Bu belge, PROJECT-AYNA-GENESIS platformunda tespit edilen 8 kritik hatanın düzeltme tasarımını içermektedir.
Hatalar; ödeme provider'larında hardcoded IP kullanımı, Yurtiçi Kargo'da sahte takip numarası üretimi,
AynaService'de Medusa v2 modül izolasyonu ihlali, ContentEngine entegrasyon kopukluğu, Mission onay
arayüzü eksikliği, LangChain/Gemini paradigma çakışması, `@ts-ignore` ile bastırılan tip hataları ve
Workflow compensation eksikliğini kapsamaktadır.

Düzeltme stratejisi: minimal, hedefli değişiklikler — mevcut çalışan davranışlar (graceful degradation,
Ollama fallback, Truth Logging, PENDING_APPROVAL akışı) korunacaktır.

---

## Sözlük

- **Bug_Condition (C)**: Hatayı tetikleyen girdi koşulu — örn. `user_ip = "127.0.0.1"` ile ödeme isteği
- **Property (P)**: Düzeltilmiş fonksiyonun sağlaması gereken davranış
- **Preservation**: Düzeltme sonrası değişmeden kalması gereken mevcut davranışlar
- **isBugCondition(X)**: Girdinin hatalı kodu tetikleyip tetiklemediğini döndüren pseudocode fonksiyonu
- **remoteQuery**: Medusa v2'nin modüller arası veri erişim pattern'i — `container as any` yerine kullanılacak
- **AbstractPaymentProvider**: Medusa v2 ödeme provider'larının extend etmesi gereken temel sınıf
- **AbstractFulfillmentProviderService**: Medusa v2 kargo provider'larının extend etmesi gereken temel sınıf
- **USE_MOCK_PROVIDERS**: Mock mod kontrolü için `.env` değişkeni
- **PENDING_APPROVAL**: Mission tabanlı otonom yönetim akışının onay bekleme durumu
- **MedusaService**: Modül servislerinin extend ettiği temel sınıf — CRUD metodlarını otomatik üretir

---

## Hata Detayları

### Hata 1: PayTR ve İyzico'da Hardcoded IP Adresi

#### Hata Koşulu

Ödeme başlatma isteğinde gerçek müşteri IP'si HTTP header'larında mevcut olmasına rağmen
provider'lar `"127.0.0.1"` sabit değerini API'ye göndermektedir.

**Formal Specification:**
```
FUNCTION isBugCondition_HardcodedIP(X)
  INPUT: X of type PaymentInitiationRequest
  OUTPUT: boolean

  RETURN X.headers içinde "x-forwarded-for" VEYA "x-real-ip" mevcut
         AND provider.user_ip = "127.0.0.1" olarak sabitlenmiş
END FUNCTION
```

**Örnekler:**
- Müşteri `x-forwarded-for: 88.249.10.5` header'ı ile istek atar → PayTR'ye `user_ip: "127.0.0.1"` gider → ödeme reddedilir
- İyzico buyer nesnesinde `ip: "127.0.0.1"` → fraud şüphesiyle bloke
- Proxy arkasındaki müşteri `x-forwarded-for: 88.249.10.5, 10.0.0.1` gönderir → ilk IP alınmalı

---

### Hata 2: Yurtiçi Kargo'da Sahte Takip Numarası

#### Hata Koşulu

`USE_MOCK_PROVIDERS` değişkeni tanımlı değilken veya `false` iken sistem gerçek API çağrısı
yapmak yerine `Math.random()` ile sahte takip numarası üretmektedir.

**Formal Specification:**
```
FUNCTION isBugCondition_FakeTracking(X)
  INPUT: X of type FulfillmentCreationRequest
  OUTPUT: boolean

  RETURN process.env.USE_MOCK_PROVIDERS ≠ "true"
         AND tracking_number = "YT-" + Math.random().toString(36)...
END FUNCTION
```

**Örnekler:**
- Production ortamında kargo oluşturulur → `YT-A3F9K2` gibi sahte numara → müşteri sorgulayamaz
- API anahtarı eksik + mock kapalı → hata fırlatılmalı, sahte numara üretilmemeli
- `USE_MOCK_PROVIDERS=true` → `MOCK-YT-{timestamp}` formatında izlenebilir mock (bu davranış korunacak)

---

### Hata 3: AynaService'de `container as any` Modül İzolasyonu İhlali

#### Hata Koşulu

AynaService, Medusa v2 modül sınırlarını aşarak `(container as any)` cast'i ile diğer modüllerin
servislerine doğrudan erişmektedir.

**Formal Specification:**
```
FUNCTION isBugCondition_ContainerAny(X)
  INPUT: X of type ServiceResolutionAttempt
  OUTPUT: boolean

  RETURN X.accessPattern = "(container as any).productModuleService"
         OR X.accessPattern = "(container as any)[\"product\"]"
         AND Medusa v2 modül izolasyonu ihlal ediliyor
END FUNCTION
```

**Örnekler:**
- `(container as any).productModuleService` → Medusa güncelleme sonrası `undefined` döner
- `(container as any)["inventory"]` → sessiz hata, araçlar çalışmaz
- Doğru pattern: `remoteQuery` ile API route seviyesinde veri çekme

---

### Hata 4: ContentEngine ↔ AynaService Entegrasyonu Kırık

`executeCreateBlogPost` metodu her zaman mock response döndürmekte, gerçek ContentEngineService
entegrasyonu yapılmamaktadır. Admin yanıltıcı başarı mesajı almaktadır.

---

### Hata 5: Mission Onay Arayüzü Eksik

`manage_inventory` ve `create_campaign` araçları `PENDING_APPROVAL` statüsünde Mission kaydı
oluşturmakta ancak Admin UI'da bu mission'ları listeleyen ve onaylayan bir sayfa bulunmamaktadır.

---

### Hata 6: LangChain/Gemini Paradigma Çakışması

`src/lib/agents/pool-calculator.ts` LangChain `DynamicTool` kullanırken AynaService Gemini native
function calling kullanmaktadır. İki paradigma aynı projede bakım maliyetini artırmaktadır.

---

### Hata 7: `@ts-ignore` ile Bastırılan Tip Hataları

`AynaService` içinde `createMemoryTruths`, `listMemoryInsights`, `updateMissions` gibi MedusaService
CRUD metodları `// @ts-ignore` ile çağrılmaktadır. Runtime hataları derleme zamanında tespit edilememektedir.

---

### Hata 8: Workflow Compensation Eksikliği

`generate-content` ve `track-order-placed` workflow'larında adım başarısızlığında önceki adımların
yan etkileri geri alınmamaktadır.

---

## Beklenen Davranış

### Korunan Davranışlar (Preservation Requirements)

**Değişmeden Kalması Gerekenler:**
- API anahtarları eksik olduğunda graceful degradation — sistem başlatılabilir durumda kalmalı (3.1)
- Geçerli IP mevcut olduğunda ödeme akışı başarıyla tamamlanmalı (3.2)
- `USE_MOCK_PROVIDERS=true` modunda mock takip numarası dönmeli (3.3)
- `processMessage` metoduna `productModuleService` parametre olarak iletildiğinde ürün araması çalışmalı (3.4)
- Gemini API çalışırken tool calling döngüsü doğru yanıt üretmeli (3.5)
- Gemini başarısız olduğunda Ollama fallback devreye girmeli (3.6)
- `create_product` ve `create_category` araçları çalışmaya devam etmeli (3.7)
- `manage_inventory` ve `create_campaign` araçları `PENDING_APPROVAL` Mission kaydı oluşturmalı (3.8)
- Truth Logging — her tool call `memory_truth` tablosuna kaydedilmeli (3.9)
- `maintainMemory` — eski insight'lar silinmeden `is_archived: true` ile arşivlenmeli (3.10)
- Docker modül izolasyonu ve volume yapısı korunmalı (3.11)
- DML modelleri (`MemoryTruth`, `MemoryInsight`, `MemoryConscience`, `Mission`) doğru çalışmalı (3.12)

**Kapsam:**
Hata koşullarını tetiklemeyen tüm girdiler (geçerli IP, mock mod açık, parametre olarak iletilen servisler)
bu düzeltmeden etkilenmemelidir.

---

## Hipotez: Kök Neden Analizi

### Hata 1 — Hardcoded IP
1. **Geliştirme Kolaylığı**: Geliştirme aşamasında `"127.0.0.1"` placeholder olarak yazıldı, production'a taşınmadan önce gerçek IP çekme mantığı eklenmedi.
2. **HTTP Context Erişimi**: Provider sınıfları `InitiatePaymentInput.context` üzerinden HTTP header'larına erişim yolunu bilmiyor olabilir.
3. **Test Eksikliği**: Sandbox ortamında `"127.0.0.1"` kabul edildiği için hata fark edilmedi.

### Hata 2 — Sahte Takip Numarası
1. **API Entegrasyonu Tamamlanmadı**: Yurtiçi Kargo API anahtarı temin edilmeden önce placeholder yazıldı.
2. **Mock/Production Ayrımı Yok**: `USE_MOCK_PROVIDERS` kontrolü hiç eklenmedi.
3. **Sessiz Hata**: Hata fırlatmak yerine sahte veri üretmek tercih edildi.

### Hata 3 — container as any
1. **Medusa v2 Modül İzolasyonu Bilinmiyordu**: `remoteQuery` pattern'i yerine doğrudan container erişimi kullanıldı.
2. **Tip Sistemi Bypass**: `any` cast'i TypeScript'in modül sınırı uyarılarını susturdu.
3. **Kısa Vadeli Çözüm**: Hızlı çalıştırmak için modül izolasyonu göz ardı edildi.

### Hata 4 — ContentEngine Entegrasyonu
1. **Modül Bağımlılığı Çözülemedi**: AynaService, ContentEngineService'e modül sınırları içinde erişemedi.
2. **Mock ile Geçiştirme**: Gerçek entegrasyon yerine mock response bırakıldı.

### Hata 5 — Mission UI Eksikliği
1. **Backend-First Geliştirme**: Mission kaydı oluşturma tamamlandı ama Admin UI sayfası yazılmadı.

### Hata 6 — Paradigma Çakışması
1. **Farklı Geliştirme Dönemleri**: LangChain entegrasyonu Gemini native function calling'den önce yazıldı.
2. **Refactor Yapılmadı**: Gemini'ye geçildiğinde eski LangChain kodu temizlenmedi.

### Hata 7 — @ts-ignore
1. **MedusaService Tip Üretimi**: `MedusaService({...})` ile oluşturulan CRUD metodlarının tipleri TypeScript tarafından otomatik çıkarılamıyor.
2. **Hızlı Çözüm**: Tip hatalarını düzeltmek yerine `@ts-ignore` ile geçiştirildi.

### Hata 8 — Compensation Eksikliği
1. **Workflow SDK Öğrenme Eğrisi**: `createStep` compensation mantığı eklenmeden adımlar yazıldı.
2. **Happy Path Odaklı Geliştirme**: Hata senaryoları test edilmedi.

---

## Doğruluk Özellikleri

Property 1: Hata Koşulu — Gerçek IP Adresi Kullanımı

_For any_ ödeme başlatma isteğinde `x-forwarded-for` veya `x-real-ip` header'ı mevcut olduğunda,
düzeltilmiş `initiatePayment` fonksiyonu PayTR/İyzico API'sine `"127.0.0.1"` yerine gerçek
istemci IP adresini iletmeli ve ödeme akışını başarıyla başlatmalıdır.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Koruma — Mevcut Ödeme Akışı Davranışı

_For any_ ödeme isteğinde hata koşulu geçerli değilse (API anahtarı eksik → placeholder, geçerli IP
mevcut → akış başlatılıyor), düzeltilmiş fonksiyon orijinal fonksiyonla aynı davranışı sergilemeli,
graceful degradation korunmalıdır.

**Validates: Requirements 3.1, 3.2**

Property 3: Hata Koşulu — Yurtiçi Mock/Production Ayrımı

_For any_ kargo oluşturma isteğinde `USE_MOCK_PROVIDERS` değişkeninin durumuna göre düzeltilmiş
`createFulfillment` fonksiyonu ya gerçek API'den takip numarası almalı ya da açık hata fırlatmalı;
`Math.random()` ile sahte numara üretmemelidir.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 4: Koruma — Mock Mod Davranışı

_For any_ kargo isteğinde `USE_MOCK_PROVIDERS=true` ise düzeltilmiş fonksiyon `MOCK-YT-{timestamp}`
formatında izlenebilir mock takip numarası döndürmeli, mevcut mock davranışı korunmalıdır.

**Validates: Requirements 3.3**

Property 5: Hata Koşulu — remoteQuery Modül İzolasyonu

_For any_ AynaService servis çözümleme girişiminde `(container as any)` cast'i yerine `remoteQuery`
pattern'i kullanılmalı; Medusa v2 modül sınırları ihlal edilmemelidir.

**Validates: Requirements 2.7, 2.8, 2.9**

Property 6: Koruma — AynaService Fonksiyonel Davranış

_For any_ `processMessage` çağrısında `productModuleService` parametre olarak iletildiğinde
düzeltilmiş servis ürün araması yapabilmeli, tool calling döngüsü ve Ollama fallback çalışmaya
devam etmelidir.

**Validates: Requirements 3.4, 3.5, 3.6**

---

## Düzeltme Implementasyonu

### Değişiklik 1: IP Adresi Çekme Yardımcı Fonksiyonu

**Dosya:** `src/utils/get-client-ip.ts` (yeni dosya)

```typescript
export function getClientIp(context: any): string {
  const headers = context?.headers || context?.req?.headers || {}
  const forwarded = headers["x-forwarded-for"]
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded : forwarded[0])
      .split(",")[0].trim()
  }
  return headers["x-real-ip"] || headers["cf-connecting-ip"] || "127.0.0.1"
}
```

**Değişiklik:** `src/providers/paytr/provider.ts` ve `src/providers/iyzico/provider.ts` içinde
`user_ip = "127.0.0.1"` satırları `getClientIp(context)` çağrısıyla değiştirilecek.

---

### Değişiklik 2: Yurtiçi Mock/Production Ayrımı

**Dosya:** `src/providers/yurtici/service.ts`

**Değişiklikler:**
1. `createFulfillment` metoduna `USE_MOCK_PROVIDERS` kontrolü eklenir
2. Mock mod: `MOCK-YT-${Date.now()}` formatında takip numarası + açık log
3. Production mod: Gerçek Yurtiçi API çağrısı (API anahtarı eksikse açık hata)
4. `Math.random()` kullanımı tamamen kaldırılır

---

### Değişiklik 3: AynaService remoteQuery Refactor

**Dosya:** `src/modules/ayna/service.ts`

**Değişiklikler:**
1. Constructor'daki `(container as any)` servis çözümleme bloğu kaldırılır
2. `executeProductSearch` ve `executeInventoryCheck` metodları `remoteQuery` kullanacak şekilde güncellenir
3. `processMessage` metoduna iletilen servis parametreleri korunur (geriye uyumluluk)
4. API route'larında `remoteQuery` ile veri çekme pattern'i uygulanır

---

### Değişiklik 4: ContentEngine Gerçek Entegrasyonu

**Dosya:** `src/modules/ayna/service.ts` — `executeCreateBlogPost` metodu

**Değişiklikler:**
1. `remoteQuery` veya doğrudan modül referansı ile ContentEngineService erişimi
2. Mock response kaldırılır, gerçek `createPosts` çağrısı yapılır
3. Erişilemez durumda açık hata mesajı (yanıltıcı başarı mesajı değil)

---

### Değişiklik 5: Mission Onay Admin UI Sayfası

**Dosya:** `src/admin/routes/missions/page.tsx` (yeni dosya)

**Değişiklikler:**
1. Pending mission'ları listeleyen Admin UI sayfası
2. Onay butonu → `executeMission()` API çağrısı
3. Medusa v2 Admin SDK (`defineRouteConfig`) kullanımı

---

### Değişiklik 6: LangChain Araçlarını Gemini Native'e Taşıma

**Dosya:** `src/lib/agents/pool-calculator.ts` → `src/modules/ayna/tools/pool-calculator-tool.ts`

**Değişiklikler:**
1. LangChain `DynamicTool` tanımı Gemini native function declaration formatına dönüştürülür
2. Mevcut `poolCalculatorTool` ile birleştirilir veya güncellenir
3. LangChain bağımlılığı kaldırılır (eğer başka yerde kullanılmıyorsa)

---

### Değişiklik 7: @ts-ignore Kaldırma ve Tip Güvenliği

**Dosya:** `src/modules/ayna/service.ts`

**Değişiklikler:**
1. `MedusaService` CRUD metodları için tip tanımları eklenir
2. `// @ts-ignore` direktifleri kaldırılır
3. `as unknown as ReturnType<...>` veya interface tanımları ile tip güvenliği sağlanır

---

### Değişiklik 8: Workflow Compensation Adımları

**Dosyalar:** `src/workflows/generate-content.ts`, `src/workflows/track-order-placed.ts`

**Değişiklikler:**
1. Her `createStep` çağrısına `compensation` fonksiyonu eklenir
2. `generate-content`: taslak oluşturma adımı başarısız olursa oluşturulan kayıt silinir
3. `track-order-placed`: kısmi işlemler temizlenir, veri tutarlılığı korunur

---

## Test Stratejisi

### Doğrulama Yaklaşımı

İki aşamalı strateji: önce düzeltilmemiş kodda hata koşulunu gösteren counterexample'lar üretilir,
ardından düzeltmenin doğru çalıştığı ve mevcut davranışların korunduğu doğrulanır.

---

### Keşif Testi (Exploratory Bug Condition Checking)

**Amaç:** Düzeltme uygulanmadan önce hataları gösteren counterexample'lar üretmek.

**Test Planı:** Mevcut kodda hata koşullarını tetikleyen birim testleri yazılır ve DÜZELTME ÖNCESİ çalıştırılır.

**Test Senaryoları:**
1. **IP Testi:** `x-forwarded-for: 88.249.10.5` header'ı ile `initiatePayment` çağrısı → `user_ip = "127.0.0.1"` olduğu gözlemlenir (düzeltilmemiş kodda başarısız)
2. **Takip Numarası Testi:** `USE_MOCK_PROVIDERS` tanımlı değilken `createFulfillment` çağrısı → `Math.random()` çıktısı gözlemlenir
3. **Container Any Testi:** AynaService başlatılır, `productModuleService` undefined döner → araçlar çalışmaz
4. **Blog Post Testi:** `executeCreateBlogPost` çağrısı → mock response döner, gerçek kayıt oluşmaz

**Beklenen Counterexample'lar:**
- `user_ip` alanı her zaman `"127.0.0.1"` içeriyor
- Takip numarası `Math.random()` çıktısı, gerçek API kaydı yok
- `productModuleService_` undefined, ürün araması boş dönüyor

---

### Düzeltme Doğrulama (Fix Checking)

**Amaç:** Hata koşulunun geçerli olduğu tüm girdilerde düzeltilmiş fonksiyonun beklenen davranışı sergilemesi.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition_HardcodedIP(X) DO
  result := initiatePayment_fixed(X)
  ASSERT result.user_ip = extractRealIP(X.headers)
  ASSERT result.user_ip ≠ "127.0.0.1"
END FOR

FOR ALL X WHERE isBugCondition_FakeTracking(X) DO
  result := createFulfillment_fixed(X)
  ASSERT result.tracking_number gerçek API'den VEYA açık hata fırlatıldı
  ASSERT Math.random() kullanılmadı
END FOR
```

---

### Koruma Doğrulama (Preservation Checking)

**Amaç:** Hata koşulunun geçerli olmadığı girdilerde davranışın değişmediğini doğrulamak.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition_HardcodedIP(X) DO
  ASSERT initiatePayment_original(X) = initiatePayment_fixed(X)
END FOR

FOR ALL X WHERE USE_MOCK_PROVIDERS = "true" DO
  ASSERT createFulfillment_original(X) = createFulfillment_fixed(X)
END FOR
```

**Test Senaryoları:**
1. **Graceful Degradation Koruması:** API anahtarı eksik → placeholder response hâlâ dönüyor
2. **Mock Mod Koruması:** `USE_MOCK_PROVIDERS=true` → `MOCK-YT-{timestamp}` formatı korunuyor
3. **Tool Calling Koruması:** Gemini API çalışırken tool calling döngüsü değişmeden çalışıyor
4. **Fallback Koruması:** Gemini başarısız → Ollama fallback devreye giriyor
5. **Truth Logging Koruması:** Her tool call `memory_truth` tablosuna kaydediliyor
6. **PENDING_APPROVAL Koruması:** `manage_inventory` → Mission kaydı oluşturuluyor

---

### Birim Testleri

- `getClientIp` yardımcı fonksiyonu: `x-forwarded-for`, `x-real-ip`, proxy zinciri, header yok senaryoları
- `YurticiProviderService.createFulfillment`: mock mod açık/kapalı, API anahtarı eksik senaryoları
- `AynaService.executeProductSearch`: `remoteQuery` pattern ile servis çözümleme
- `executeCreateBlogPost`: gerçek ContentEngine entegrasyonu ve hata durumu
- Workflow compensation: adım başarısızlığında rollback davranışı

---

### Property-Based Testler

- Rastgele HTTP header kombinasyonları ile `getClientIp` → her zaman geçerli IP veya fallback döner
- Rastgele `USE_MOCK_PROVIDERS` değerleri ile `createFulfillment` → `Math.random()` hiçbir zaman kullanılmaz
- Rastgele `processMessage` girdileri ile AynaService → Truth Logging her zaman çalışır
- Rastgele ödeme miktarları ile `initiatePayment` → graceful degradation korunur

---

### Entegrasyon Testleri

- Tam ödeme akışı: gerçek IP header'ı → PayTR/İyzico token alımı
- Tam kargo akışı: mock mod → fulfillment kaydı oluşturma
- AynaService + ContentEngine: blog yazısı oluşturma uçtan uca
- Mission akışı: `manage_inventory` → pending Mission → Admin UI onayı → `executeMission`
- Workflow hata senaryosu: adım başarısızlığı → compensation → veri tutarlılığı
