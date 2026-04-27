# Hata Düzeltme Gereksinimleri Belgesi

## Giriş

PROJECT-AYNA-GENESIS platformunda tespit edilen kritik hatalar ve mimari borçlar bu belgede tanımlanmaktadır.
Sorunlar üç ana kategoride ele alınmaktadır:

1. **Production Blocker'lar** — Canlı ortamda ödeme ve kargo işlemlerini tamamen bozan hatalar
2. **Kısa Vadeli Sorunlar** — Eksik entegrasyonlar ve tamamlanmamış akışlar
3. **Teknik Borç** — Mimari bütünlüğü tehdit eden kod kalitesi sorunları

Etkilenen bileşenler: `PayTRProvider`, `IyzicoProvider`, `YurticiProviderService`, `AynaService`.

---

## Hata Analizi

### Mevcut Davranış (Kusur)

#### Hata 1: PayTR ve İyzico'da Hardcoded IP Adresi

1.1 WHEN bir müşteri ödeme başlatır THEN sistem `user_ip` değeri olarak her zaman `"127.0.0.1"` gönderir (`src/providers/paytr/provider.ts` ~satır 70, `src/providers/iyzico/provider.ts` ~satır 100)

1.2 WHEN PayTR fraud detection sistemi `user_ip = "127.0.0.1"` olan bir istek alır THEN ödeme isteği reddedilir çünkü localhost IP'si geçersiz kabul edilir

1.3 WHEN İyzico API'si `ip: "127.0.0.1"` olan bir buyer nesnesi alır THEN ödeme akışı fraud şüphesiyle bloke edilir

#### Hata 2: Yurtiçi Kargo'da Sahte Takip Numarası

1.4 WHEN bir sipariş için kargo oluşturulur THEN sistem `"YT-" + Math.random().toString(36).substr(2, 9).toUpperCase()` ile rastgele bir takip numarası üretir (`src/providers/yurtici/service.ts` ~satır 40)

1.5 WHEN müşteri bu takip numarasıyla Yurtiçi Kargo sistemini sorgular THEN kargo bulunamaz çünkü numara gerçek bir Yurtiçi API kaydına karşılık gelmez

1.6 WHEN Yurtiçi API anahtarı henüz temin edilmemiş durumdadır THEN sistem yine de sahte numara üretmeye devam eder ve bu durum müşteriye yanlış bilgi verir

#### Hata 3: AynaService'de `container as any` ile Servis Çözümleme

1.7 WHEN AynaService başlatılır THEN `(container as any).productModuleService || (container as any)["product"]` ifadesiyle modül servisleri çözümlenir (`src/modules/ayna/service.ts` ~satır 80-85)

1.8 WHEN Medusa v2 bir güncelleme alır veya modül isimlendirmesi değişir THEN bu `any` cast'leri sessizce `undefined` döner ve tüm ürün/stok araçları çalışmaz hale gelir

1.9 WHEN AynaService modül izolasyonu dışında başka modüllere doğrudan erişir THEN Medusa v2'nin modüler mimari prensibi ihlal edilmiş olur

#### Hata 4: ContentEngine ↔ AynaService Entegrasyonu Kırık

1.10 WHEN admin `create_blog_post` aracını tetikler THEN sistem her zaman mock response döner: `"Entegrasyon beklemede"` (`src/modules/ayna/service.ts` - `executeCreateBlogPost` metodu)

1.11 WHEN `contentEngineService_` container üzerinden çözümlenemez THEN gerçek blog yazısı oluşturulmaz ve admin yanıltıcı bir başarı mesajı alır

#### Hata 5: Mission Onay Akışı Tamamlanmamış

1.12 WHEN `manage_inventory` veya `create_campaign` araçları çağrılır THEN `status: "pending"` ile bir Mission kaydı oluşturulur

1.13 WHEN admin bu pending mission'ı onaylamak ister THEN Admin UI'da bu mission'ları listeleyen ve `executeMission()` metodunu tetikleyen bir arayüz mevcut değildir

#### Hata 6: LangChain ve Gemini Native Çakışması

1.14 WHEN `src/lib/agents/pool-calculator.ts` çalışır THEN LangChain `DynamicTool` paradigması kullanılır

1.15 WHEN AynaService araçları çalışır THEN Gemini native function calling paradigması kullanılır

1.16 WHEN iki farklı paradigma aynı projede birlikte bulunur THEN bakım maliyeti artar, araç tanımları çoğalır ve tutarsız davranışlar ortaya çıkabilir

#### Hata 7: `@ts-ignore` ile Geçiştirilen Tip Hataları

1.17 WHEN `AynaService` içindeki `createMemoryTruths`, `listMemoryInsights`, `updateMissions` gibi MedusaService CRUD metodları çağrılır THEN `// @ts-ignore` direktifleriyle tip güvenliği devre dışı bırakılır

1.18 WHEN BigNumber operasyonları gerçekleştirilir THEN `@ts-ignore` ile tip hataları bastırılır ve olası runtime hataları derleme zamanında tespit edilemez

#### Hata 8: Workflow Compensation Eksikliği

1.19 WHEN `generate-content` workflow'u çalışırken bir adım başarısız olur THEN önceki adımların yan etkileri (oluşturulan taslaklar vb.) geri alınmaz

1.20 WHEN `track-order-placed` workflow'u çalışırken bir adım başarısız olur THEN kısmi işlemler temizlenmez ve veri tutarsızlığı oluşabilir

---

### Beklenen Davranış (Doğru)

#### Düzeltme 1: Gerçek IP Adresi Kullanımı

2.1 WHEN bir müşteri ödeme başlatır THEN sistem `x-forwarded-for` veya `x-real-ip` HTTP header'larından gerçek istemci IP adresini almalı ve PayTR/İyzico API'sine iletmelidir

2.2 WHEN `x-forwarded-for` header'ı birden fazla IP içerir (proxy zinciri) THEN sistem ilk IP adresini (gerçek istemci IP'si) kullanmalıdır

2.3 WHEN hiçbir IP header'ı mevcut değilse THEN sistem güvenli bir fallback değeri kullanmalı ve bu durumu loglayarak uyarı vermelidir

#### Düzeltme 2: Profesyonel Mock Provider Pattern

2.4 WHEN `USE_MOCK_PROVIDERS=true` ortam değişkeni tanımlıdır THEN Yurtiçi provider gerçek API çağrısı yapmadan `MOCK-YT-{timestamp}` formatında izlenebilir bir mock takip numarası döndürmeli ve bu durumu açıkça loglamalıdır

2.5 WHEN `USE_MOCK_PROVIDERS=false` veya tanımlı değildir THEN Yurtiçi provider gerçek Yurtiçi Kargo API'sine istek atmalı ve gerçek takip numarasını döndürmelidir

2.6 WHEN Yurtiçi API anahtarları eksikse ve mock mod kapalıysa THEN sistem açık bir hata fırlatmalı, sessizce sahte veri üretmemelidir

#### Düzeltme 3: remoteQuery Pattern ile Modül İzolasyonu

2.7 WHEN AynaService başka modüllerin servislerine ihtiyaç duyar THEN `container as any` cast'i yerine Medusa v2'nin `remoteQuery` pattern'i kullanılmalıdır

2.8 WHEN ürün veya stok verisi gerektiğinde THEN bu veri API route seviyesinde `remoteQuery` ile çekilmeli ve `processMessage` metoduna parametre olarak iletilmelidir

2.9 WHEN AynaService modülü başlatılır THEN başka modüllerin servislerine doğrudan bağımlılık olmaksızın başarıyla başlamalıdır

#### Düzeltme 4: ContentEngine Gerçek Entegrasyonu

2.10 WHEN admin `create_blog_post` aracını tetikler THEN sistem ContentEngineService üzerinden gerçek bir blog yazısı kaydı oluşturmalıdır

2.11 WHEN ContentEngineService erişilemez durumdaysa THEN sistem açık bir hata mesajı döndürmeli, yanıltıcı mock başarı mesajı vermemelidir

#### Düzeltme 5: Mission Onay Arayüzü

2.12 WHEN admin paneline gidilir THEN bekleyen (pending) mission'ları listeleyen bir Admin UI sayfası mevcut olmalıdır

2.13 WHEN admin bir mission'ı onaylar THEN `executeMission()` metodu tetiklenmeli ve sonuç admin'e gösterilmelidir

#### Düzeltme 6: Tek Paradigmaya Geçiş

2.14 WHEN havuz hesaplama aracı kullanılır THEN LangChain `DynamicTool` yerine Gemini native function calling formatında tanımlanmış araç kullanılmalıdır

2.15 WHEN tüm araçlar tek bir paradigmada tanımlanır THEN araç tanımları `src/modules/ayna/tools/` altında tutarlı bir formatta yer almalıdır

#### Düzeltme 7: Tip Güvenliği

2.16 WHEN MedusaService CRUD metodları çağrılır THEN `@ts-ignore` direktifleri kaldırılmalı ve doğru tip tanımları kullanılmalıdır

2.17 WHEN BigNumber operasyonları gerçekleştirilir THEN Medusa v2'nin `model.number()` kuralına uygun tip güvenli kod yazılmalıdır

#### Düzeltme 8: Workflow Compensation

2.18 WHEN `generate-content` workflow'unda herhangi bir adım başarısız olur THEN compensation step'leri önceki adımların yan etkilerini geri almalıdır

2.19 WHEN `track-order-placed` workflow'unda herhangi bir adım başarısız olur THEN compensation step'leri kısmi işlemleri temizlemeli ve veri tutarlılığını korumalıdır

---

### Değişmez Davranış (Regresyon Önleme)

3.1 WHEN API anahtarları eksik olduğunda THEN sistem DEVAM ETMELİ placeholder response döndürerek başlatılabilir durumda kalmalıdır (mevcut graceful degradation davranışı korunmalıdır)

3.2 WHEN geçerli bir müşteri IP adresi mevcutsa THEN sistem DEVAM ETMELİ ödeme akışını başlatmalı ve PayTR/İyzico token'ı başarıyla almalıdır

3.3 WHEN `USE_MOCK_PROVIDERS=true` modunda kargo oluşturulur THEN sistem DEVAM ETMELİ mock takip numarasını döndürmeli ve fulfillment kaydını oluşturmalıdır

3.4 WHEN AynaService `processMessage` metoduna `productModuleService` parametre olarak iletilir THEN sistem DEVAM ETMELİ ürün araması yapabilmelidir

3.5 WHEN Gemini API anahtarı geçerliyse THEN sistem DEVAM ETMELİ tool calling döngüsünü çalıştırmalı ve doğru yanıt üretmelidir

3.6 WHEN Gemini API başarısız olursa THEN sistem DEVAM ETMELİ Ollama fallback mekanizmasını devreye sokmalıdır

3.7 WHEN admin `create_product` veya `create_category` araçlarını kullanır THEN sistem DEVAM ETMELİ bu işlemleri başarıyla gerçekleştirmelidir

3.8 WHEN `manage_inventory` veya `create_campaign` araçları çağrılır THEN sistem DEVAM ETMELİ `PENDING_APPROVAL` statüsünde Mission kaydı oluşturmalıdır

3.9 WHEN `memory_truth` kaydı oluşturulur THEN sistem DEVAM ETMELİ her tool call'ı dürüstçe loglayarak Truth Logging prensibini korumalıdır

3.10 WHEN hafıza bakımı (maintainMemory) tetiklenir THEN sistem DEVAM ETMELİ eski insight'ları silmeden `is_archived: true` ile arşivlemelidir

3.11 WHEN Docker ortamında çalışılır THEN sistem DEVAM ETMELİ modül izolasyonunu ve volume yapısını koruyarak başarıyla başlamalıdır

3.12 WHEN Medusa v2 DML modelleri kullanılır THEN sistem DEVAM ETMELİ `model.define()` ile tanımlanmış tüm modeller (`MemoryTruth`, `MemoryInsight`, `MemoryConscience`, `Mission`) doğru çalışmalıdır

---

## Hata Koşulu Analizi (Bug Condition Methodology)

### Hata 1 & 2: Ödeme Provider'larında Hardcoded IP

```pascal
FUNCTION isBugCondition_HardcodedIP(X)
  INPUT: X of type PaymentInitiationRequest
  OUTPUT: boolean

  RETURN X.context içinde gerçek müşteri IP'si mevcut
         AND provider user_ip alanı "127.0.0.1" olarak sabitlenmiş
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_HardcodedIP(X) DO
  result ← initiatePayment'(X)
  ASSERT result.user_ip = extractRealIP(X.headers)
  ASSERT result.user_ip ≠ "127.0.0.1"
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugCondition_HardcodedIP(X) DO
  ASSERT initiatePayment(X) = initiatePayment'(X)
END FOR
```

### Hata 3: Yurtiçi Sahte Tracking

```pascal
FUNCTION isBugCondition_FakeTracking(X)
  INPUT: X of type FulfillmentCreationRequest
  OUTPUT: boolean

  RETURN USE_MOCK_PROVIDERS = false
         AND tracking_number üretimi Math.random() kullanıyor
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_FakeTracking(X) DO
  result ← createFulfillment'(X)
  ASSERT result.tracking_number gerçek Yurtiçi API'den alınmış
         OR açık hata fırlatılmış (API anahtarı eksikse)
END FOR
```

### Hata 4: AynaService Modül İzolasyonu

```pascal
FUNCTION isBugCondition_ContainerAny(X)
  INPUT: X of type ServiceResolutionAttempt
  OUTPUT: boolean

  RETURN X.target modülü Medusa v2 modül sınırları dışında
         AND erişim (container as any) cast'i ile yapılıyor
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugCondition_ContainerAny(X) DO
  result ← resolveService'(X)
  ASSERT result remoteQuery pattern kullanıyor
  ASSERT (container as any) cast'i yok
END FOR
```
