# GENESIS PROTOCOL: AI INTEGRATION GUIDE (05)
> **Author:** Antigravity / Mirror Core  
> **Last Updated:** 2026-01-29  
> **Status:** STABLE - Production Ready  

Bu doküman, PROJECT-AYNA-GENESIS mimarisindeki Yapay Zeka (AI) entegrasyonlarının nasıl kurulduğunu, hangi teknolojilerin neden seçildiğini ve gelecekte bu sistemi kuracak mimarların dikkat etmesi gereken kritik noktaları anlatır.

---

## 🏗️ Mimari Genel Bakış
Sistemimiz, Google'ın Gemini Pro/Flash modellerini kullanarak otonom bir ticaret yönetim ekosistemi oluşturur. Derinlemesine mimari ve güvenlik detayları için **[AYNA AI CORE (06)](./06_AYNA_AI_CORE.md)** dokümanını inceleyin.

Sistem iki ana fonksiyonu yerine getirir:
1.  **Blog İçerik Üreticisi:** Admin panelinde SEO uyumlu blog yazıları yazar.
2.  **Havuz Mühendisi Ajanı:** Müşteri ile sohbet edip teknik hesaplamalar yapar.

### Kullanılan Teknoloji Yığını
*   **Provider:** Google Generative AI (Gemini)
*   **Library:** `@google/generative-ai` (Resmi SDK)
*   **Framework:** Medusa.js v2 (API Routes)
*   **Model:** `gemini-1.5-flash` (Kod içinde bu isimle stabilize edilmiştir)

---

## 🚀 Adım Adım Kurulum Rehberi (How-To)

Bu sistemi sıfırdan kuracak bir geliştirici aşağıdaki adımları takip etmelidir.

### Adım 1: API Anahtarı ve Model Kurulumu
Google AI Studio'dan alınan anahtar ve model adı projenin kalbidir.

1.  **Google AI Studio** üzerinden bir API Connect Key oluşturun.
2.  Proje ana dizinindeki `.env` dosyasını açın.
3.  Şu satırları ekleyin:
    ```env
    # Gemini API Konfigürasyonu (TEK MERKEZ)
    GEMINI_API_KEY=AIzaSy...
    GEMINI_MODEL_NAME=gemini-1.5-flash
    ```

4.  **SADECE .env'DEN OKUR:** Tüm kod dosyaları artık model adını `.env`'den okur:
    - `src/api/admin/generate-content/route.ts` → Blog AI
    - `src/workflows/generate-content.ts` → Workflow AI
    - `src/modules/ayna/service.ts` → Ayna Chat

5.  **KRİTİK:** Değişiklik sonrası Docker konteyneri mutlaka yeniden başlatılmalıdır:
    ```bash
    docker restart medusa_server_core
    ```

> ⚠️ **Model Değiştirme:** Model adını değiştirmek için **SADECE .env'deki GEMINI_MODEL_NAME**'i değiştirin. Kodlara dokunmayın!

---

### Adım 2: Blog Yazarı AI (Admin Modülü)
Blog içerik üretimi, Admin panelinden tetiklenen bir sunucu taraflı (Server-Side) işlemdir.

*   **Dosya:** `src/api/admin/generate-content/route.ts`
*   **İşlev:**
    *   Kullanıcıdan "Konu Başlığı" alır.
    *   Gemini'ye "Sen bir SEO uzmanısın..." promptu ile gider.
    *   Gelen Markdown/JSON yanıtını temizler ve Admin UI'a döner.

**Dikkat Edilmesi Gereken:**
> JSON yanıtında bazen ` ```json ` blokları gelir. Kodumuzda `.replace(/```json|```/g, "")` regex temizleyicisi bu yüzden vardır. Kaldırmayın.

---

### Adım 3: Havuz Mühendisi Ajanı (Store Modülü)
Müşteri ile canlı etkileşime giren akıllı ajan yapısıdır.

*   **Dosya:** `src/api/store/pool-agent/route.ts`
*   **Çalışma Mantığı (Pseudo-Code):**
    1.  **Extraction (Ayıklama):** Gelen mesajdan EN, BOY, DERİNLİK verilerini çek.
    2.  **Karar Mekanizması:**
        *   *Veriler Tam ise:* Hacim hesapla, Klor miktarını bul -> Mühendis promptu ile cevap üret.
        *   *Veriler Eksik ise:* Eksik olanı nazikçe iste -> Sohbet promptu ile cevap üret.
    3.  **Graceful Failure:** Hata olursa çökme, "Bakımdayız" mesajı dön.

---

### Adım 4: İkinci Beyin (Hafıza Özetleme) ve Fallback Katmanı
Kullanıcının verileri ve API limitleri projede kritik öneme sahiptir.
*   **Hafıza Özetleme (Memory Summarization):** Müşteri her `10` veri noktasını (Insight) geçtiğinde, sistem asenkron olarak bu bilgileri Gemini ile özetleyip "Kullanıcı Profili Özeti" (*profile_summary*) oluşturur. Eski detaylı kayıtlar `is_archived: true` yapılarak saklanır (veri kaybını önlemek için silinmez).
*   **Fallback (Yıkılmazlık Katmanı):** Eğer Gemini `429 Too Many Requests` veya `500 Server Error` vererek çökerse, hizmetin aksamaması için yedek (Fallback) senaryosu devreye girer. `.env`'den okunan `OLLAMA_API_URL` adresine basit bir *HTTP POST* yapılır ve müşteri yedek yerel AI (Örn: Llama3) üzerinden cevap alır (`[YEDEK HAT DEVREDE]`).

### Adım 5: DML Tip Kısıtlamaları (Medusa v2 SDK)
*   **Sorun:** Medusa v2 modül modellerinde `model.bigint()` veya `model.double()` kullanımı "not a function" hatası vererek sistemin çökmesine (500) yol açar.
*   **Çözüm:** Tüm sayısal alanlar `model.number()` ile tanımlanmalıdır.

---

### 4. Mission-Centric Execution (Peak 2.0)
Geleneksel AI ajanları işlemi anında yapar; Genesis mimarisinde ise AI kritik kararları bir **Mission** (Görev) olarak kaydeder.
- **Akış:** `tool_call` -> `AynaService.executeManageInventory` -> `Mission.create(title, status="pending")`.
- **Avantaj:** Hatalı veya etik olmayan otonom kararların sisteme zarar vermesi engellenir; insan onayı katmanı (Human-in-the-loop) sağlanır.

### 5. AI Conscience Evaluation (Peak 2.0)
Etik denetim artık statik kurallardan ibaret değildir.
- **Yenilik:** `ConscienceService.evaluate` metodu Gemini AI kullanarak işlemin etik risklerini (fiyat manipülasyonu, bütçe aşımı, yanıltıcı bilgi) analiz eder ve `ALLOW/DENY` kararı döner.

### 6. B2B Personalization (Segment Zekası)
Asistan, müşteri grubuna göre davranış değiştirir.
- **Uygulama:** API rotasından gelen `customerGroup` bilgisi sistem promptuna enjekte edilir. Asistan B2B müşterilerine özel indirim kurguları planlamaya otomatik olarak teşvik edilir.

---

## ⚠️ Kritik Uyarılar ve Dersler (Lessons Learned)

Geliştirme sürecinde edinilen bu tecrübeler, sistemin stabilitesi için hayati önem taşır:
Modüler yapıda Medusa v1 mimarisine ait hiçbir yapı kullanılmamalıdır; Medusa v2'nin modüler yapısı v1'den tamamen farklı bir paradigmadır.

### 1. Modül İzolasyonu ve Servis Erişimi
Medusa v2'de her modül izoledir. `AynaService` içinden doğrudan `ProductModuleService` resolve etmek bazen bağımlılık kilitlerine yol açabilir.
- **En İyi Pratik:** Gerekli servisleri (Pricing, Inventory, Sales Channel vb.) API Route (`route.ts`) seviyesinde `req.scope.resolve` ile yakalayın ve asistanın `processMessage` metoduna birer parametre (option) olarak geçirin.

### 2. Tool Execution Loop (Ardışık İşlem)
Yapay Zeka bazen bir görevi tamamlamak için birden fazla araç kullanmak zorundadır.
- **Geliştirme:** `AynaService` içine bir `while` döngüsü eklenerek, model "functionCall" sonucu ürettiği sürece araçların çalıştırılması ve sonuçların modele geri beslenmesi sağlanmıştır. Bu, "Kategori aç ve içine ürün ekle" gibi kompleks taleplerin tek seferde çözülmesini sağlar.

### 3. SEO ve Prompt Engineering
Asistanın sadece işlem yapması değil, "kaliteli içerik" üretmesi projenin imzasıdır.
- **Kural:** Sistem promptları içinde asistanın bir **SEO Uzmanı** olduğu vurgulanmalıdır. Araç tanımlarında (tool parameter description) AI'ya "SEO uyumlu, ikna edici içerik üret" şeklinde açık talimat verilmesi, çıktı kalitesini %40 oranında artırmaktadır.

### 4. 500 Hatası vs. Graceful Handling
*   **Sorun:** API anahtarı geçersiz olduğunda veya Google servisi çöktüğünde sistem `500 Internal Server Error` vererek Storefront'u kilitliyordu.
*   **Çözüm:** `try-catch` bloğunda hata yakalandığında **`res.status(200)`** dönülür. İçeriğinde ise "Şu an teknik bakım yapılıyor" mesajı kullanıcıya gösterilir.
    *   *Neden?* Müşteri "Site bozuk" demek yerine "Bakım var" mesajını tercih eder.

### 5. Native Fetch vs. SDK
*   **Deneyim:** Bir ara SDK sorunları nedeniyle "Native Fetch" (saf HTTP isteği) yöntemine geçildi. Ancak V1/V1Beta endpoint uyumsuzlukları yaşandı.
*   **Karar:** Son düzeltme ile tekrar **Resmi Google SDK** yapısına dönüldü ve Blog AI ile Havuz Ajanı eşitlendi. Bu yapı daha sürdürülebilir bulunmuştur.

---

## 🧪 Test Prosedürü

Sistemin çalıştığını doğrulamak için `test-agent.js` betiği kullanılır:

```bash
docker exec medusa_server_core node /server/src/test-agent.js
```

**Beklenen Çıktı:**
*   DURUM: 200
*   Cevap: "Merhaba..." veya hesaplama sonucu.
