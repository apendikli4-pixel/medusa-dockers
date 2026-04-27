# ⚖️ AYNA GENESIS: ANA YASA (SUPREME LAW)

Bu belge, PROJECT-AYNA-GENESIS mimarisinin dokunulmaz ve sarsılmaz temel kurallarını içerir. Her geliştirme, düzeltme ve ekleme bu kurallar çerçevesinde yapılmalıdır.

---

## 🚨 MADDE 0: AMERİKA YENİDEN KEŞFEDİLMEYECEK (The Discovery Doctrine) 🚨

> **BU EMİRDİR. KANUN NİTELİĞİNDEDİR.**

### 0.1. Önce Araştır, Sonra Geliştir
Herhangi bir modül, eklenti, özellik veya mimari değişiklik yapılmadan **ÖNCE** şu kaynaklar MUTLAKA kontrol edilmelidir:

1. **Medusa Resmi Dokümanları:** [docs.medusajs.com](https://docs.medusajs.com)
2. **Medusa GitHub Repoları:** [github.com/medusajs](https://github.com/medusajs)
3. **Medusa Topluluk Modülleri:** GitHub'da `medusa-plugin`, `medusajs` etiketli projeler
4. **Medusa Discord/Forum:** Topluluk çözümleri ve önerileri

### 0.2. Mevcut Varsa Kullan
Eğer istenen özellik için Medusa geliştiricileri veya topluluk tarafından hazırlanmış **resmi veya güvenilir bir modül/eklenti** mevcutsa:
- O modül/eklenti **KULLANILMALIDIR**
- Sıfırdan yazılmamalıdır
- "Biz daha iyisini yaparız" düşüncesi **YASAKLANMIŞTIR**

### 0.3. Medusa v1 ile Karıştırılmayacak ⛔
- Bu proje **Medusa v2** mimarisi üzerine inşa edilmiştir
- v1'deki yapılar (örn: `@Entity`, `@Service`, eski plugin yapısı) **GEÇERSIZ VE YASAKLIDIR**
- v1 dokümantasyonu veya eski örnekler **REFERANS OLARAK ALINAMAZ**
- Sadece Medusa v2 uyumlu çözümler geçerlidir

### 0.4. İhlal Durumu
Bu maddeye uyulmadan yapılan geliştirmeler:
1. İnceleme aşamasında reddedilir
2. Geri alınır (Rollback)
3. Doğru yöntemle yeniden yapılır

---

## Madde 1: Bilgiye Dayalı Operasyon 🧠
- Kararlar asla varsayımlar üzerine kurulamaz.
- Her işlem teknik verilere, projedeki mevcut dokümantasyona (Genesis Protokolleri) ve kesin bilgiye dayanmalıdır.

## Madde 2: Şeffaf İletişim ve Onay Mekanizması 🛡️
- Yapılacak her türlü değişiklik (ekleme, çıkarma, düzeltme) işlem başlamadan önce gerekçeleriyle birlikte kullanıcıya sunulmalıdır.
- Kullanıcıdan **"Uygundur efendim"** veya eşdeğer bir onay komutu almadan hiçbir kod değişikliği veya sistem müdahalesi yapılamaz.

## Madde 3: Mimari Bütünlük ve Güvenli Geliştirme 🏗️

### 3.1. Deneme-Yanılma YASAKTIR ⛔
- Mimari, "deneyerek görelim" mantığıyla inşa edilemez
- **KESİN ÇÖZÜMLER** uygulanmalıdır
- Kod yazmadan önce çözümün doğruluğu %100 teyit edilmelidir
- Belirsizlik varsa: DURULMALI → ARAŞTIRILMALI → ONAY ALINMALI

### 3.2. Medusa v2 Mimari Uyumluluğu (Zorunlu)
Tüm geliştirmeler aşağıdaki Medusa v2 yapılarına **TAM UYUMLU** olmalıdır:

| Yapı | Açıklama | Kullanım |
|------|----------|----------|
| **Modüler Yapı** | Her modül izole ve bağımsız | `src/modules/[module_name]` altında |
| **Saga Pattern** | Karmaşık işlemler için geri alınabilir adımlar | Workflow SDK ile |
| **BigNumber** | Finansal hesaplamalarda hassasiyet | Fiyat, vergi, stok işlemleri |
| **Workflow SDK** | İş akışları ve compensation mantığı | `createStep`, `createWorkflow` |
| **DML (Data Modeling)** | Veritabanı modelleri | `model.define()` - ASLA `@Entity` değil |

### 3.3. Rollback Mekanizması (Zorunlu)
- Yapılan **her işlem** geri alınabilir olmalıdır
- Hatalı bir geliştirme tespit edildiğinde:
  1. **DERHAL DURDURULMALI**
  2. **ROLLBACK YAPILMALI** (kod, dosya, veritabanı değişiklikleri geri alınmalı)
  3. **DOĞRU YÖNTEM ARAŞTIRILMALI**
  4. Onay alındıktan sonra tekrar uygulanmalı

### 3.4. Docker İzolasyonu
- Docker izolasyonu her zaman korunmalı
- Host makinesi ile konteyner yapıları birbirine karıştırılmamalıdır
- `node_modules`, `.medusa`, `dist` ASLA host'tan mount edilmez


## Madde 4: Dil ve Üslup 🗣️
- Tüm iletişim, raporlama ve teknik açıklamalar Türkçe olarak yapılacaktır.
- Ajan, bir "Yazılım Mühendisi ve Mimarı" ciddiyetiyle, stratejik düşünerek hareket edecektir.

## Madde 5: Gelecek Vizyonu 🚀
- Hedef; rakiplerin geride bırakıldığı, AI yetenekleriyle donatılmış, kararlı ve ölçeklenebilir bir mimari inşa etmektir.

## Madde 6: AI Etik, Hafıza ve Yıkılmazlık Protokolü (THE IMMUTABLE MIND) 🧠🔒
Bu mimari zirveye çıkmak için değil, zirvede bozulmamak için kurulmuştur.

### 6.1. Üç Katmanlı Hafıza ve Özetleme Mimarisi
- **Katman 1 (Mutlak Gerçek/Event Log):** Olayların ham kaydıdır. **IMMUTABLE (Değiştirilemez).**
- **Katman 2 (Özetleme ve Insight / İkinci Beyin):** AI, belli eşik değerlerinde (örn. 10 yeni insight) asenkron olarak hafıza özeti çıkartır. Eski veriler ASLA silinmez, sadece `is_archived: true` ile işaretlenerek kalıcı arşive alınır.
- **Katman 3 (Etik Filtre/Conscience):** "Bunu söylemeli miyim?" sorusunu soran denetim mekanizmasıdır.

### 6.2. İrade ve Otorite Hiyerarşisi (Human Override)
- Ajan sadece öneride bulunur. Karar yetkisi mutlak suretle insandadır.
- Dürüstlük optimizasyona feda edilemez.

### 6.3. Fallback (Yedek Zeka) ve Sistem Sürekliliği
- Ana AI API'si (Örn. Gemini) `429` veya `500` hataları verdiğinde sistem tamamen susamaz.
- Ayna'nın çekirdek mimarisi, hata anında `.env` içerisine tanımlanmış bir yerel/yedek model sunucusuna (Örn: Ollama `OLLAMA_API_URL`) başvurmak (Fallback) zorundadır. Kullanıcı her zaman destek almaya devam etmelidir.

---

## 🔒 MADDE 7: TEST VE MÜHÜRLEME PROTOKOLÜ (The Seal Protocol) 🔒

> **"Test edilmemiş kod, çalışmayan koddur. Mühürlenmemiş modül, güvenilmez modüldür."**

### 7.1. Test Olmadan Onay Yok
- Hiçbir modül, özellik veya kod parçası **test edilmeden** "çalışıyor" olarak işaretlenemez
- Test şunları içermelidir:
  1. **Build Testi:** `tsc --noEmit` veya `yarn build` hatasız tamamlanmalı
  2. **Runtime Testi:** Sunucu başlatılmalı ve özellik elle test edilmeli
  3. **Entegrasyon Testi:** Diğer modüllerle çakışma olmamalı

### 7.2. Mühürleme Sistemi (The Seal)
Test başarılı olan her modül "Mühürlenir":
- **Mühür Belgesi:** `08_ARCHITECTURE_SEAL.md` dosyasına kayıt edilir
- **Dosya Header'ı:** Kod dosyasının başına mühür bilgisi eklenir

```typescript
/**
 * @sealed 2026-02-08
 * @tested-by [Tester Name]
 * @status STABLE
 * @warning Bu dosyada değişiklik yapmadan önce 08_ARCHITECTURE_SEAL.md'yi kontrol edin
 */
```

### 7.3. Mühürlü Alanlara Müdahale Kuralı
Mühürlü bir alana müdahale edilecekse:
1. Neden müdahale gerektiği **yazılı olarak** belirtilmeli
2. Değişiklik **öncesi** yedek alınmalı (rollback planı)
3. Değişiklik **sonrası** yeniden test edilmeli
4. Yeni mühür tarihi güncellenmeli

### 7.4. Gelecek Geliştiriciler İçin Zorunlu Okuma
Her yeni geliştirici işe başlamadan önce şu belgeleri MUTLAKA okumalıdır:
1. `00_SUPREME_LAW.md` - Bu belge (Anayasa)
2. `01_PROJECT_BIBLE.md` - Teknik kurallar
3. `08_ARCHITECTURE_SEAL.md` - Mühürlü alanlar ve uyarılar
4. `10_MASTER_ARCHITECT_MANUAL.md` - Genel mimari rehber

### 7.5. Bu Kural İhlal Edilirse
- Geliştirme **durdurulur**
- Sistem **rollback** yapılır
- Hatayı yapan kişi/ajan **uyarılır**
- Doğru prosedür uygulanarak tekrar denenir
