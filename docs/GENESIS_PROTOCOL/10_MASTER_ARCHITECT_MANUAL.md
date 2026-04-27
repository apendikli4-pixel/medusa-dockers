# GENESIS PROTOCOL: MASTER ARCHITECT MANUAL (06)
> **Author:** Antigravity / Mirror Core  
> **Last Updated:** 2026-01-29  
> **Status:** FINAL (Saga & Sovereign Edition)  

Bu doküman, **PROJECT-AYNA-GENESIS** mimarisinin "Kutsal Kitabı"dır. Projeyi sıfırdan devralacak bir Baş Mimarın (Lead Architect) ihtiyaç duyacağı tüm süreçleri, modüler yapıyı, entegrasyon kurallarını ve en önemlisi **Hatasız Mühendislik (Zero-Fault Engineering)** felsefesini tek bir akışta toplar.

---

## 🏛️ 1. Mimari Vizyon ve Egemenlik Yasaları (Sovereign Laws)
Bu yapı, "Sovereign Core" (Egemen Çekirdek) prensibiyle tasarlanmıştır.

### Ana Yasa (`00_SUPREME_LAW.md`) Temelleri
1.  **Tam İzolasyon:** Her modül sadece kendi sınırları içinde yaşar. `src/modules/...` klasörü, dış dünyadan bağımsız bir "Service Oriented" yapıdır.
2.  **Bağımlılık Reddi:** Dış kütüphaneler (LangChain, SDK'lar) eğer kararsızlık yaratıyorsa, yerini daima **Saf Kod (Native Code)** alır. Havuz Ajanı'nda LangChain'in terk edilmesi ve Native SDK'ya dönülmesi bu yasanın sonucudur.
3.  **Hatasız Matematik:** E-Ticaret sisteminde "float" kullanılmaz. Tüm parasal işlemler ve kritik stok sayımları **BigNumber** hassasiyetiyle yönetilir.

---

## 🧩 2. Modüler Yapı ve Workflow SDK (Saga Pattern)
Medusa v2 mimarisi, klasik monolitik yapı yerine **Modüler Monolit** ve **Saga Pattern** üzerine kuruludur.

### A. Modül Yapısı
*   **Core (Çekirdek):** `/src/api` ve veritabanı katmanı.
*   **Modules:** `/src/modules/` altında yaşayan otonom servisler. Örn: `content_engine`.
    *   Bu modüller kendi veritabanı tablolarına sahip olabilir.
    *   Servisler arası iletişim **Doğrudan Çağrı** veya **Event Bus (Redis)** üzerinden yapılır.

### B. Workflow Engine & Saga Pattern
Karmaşık işlemler (örn: "Sipariş Oluştur -> Stoğu Düş -> Ödeme Al -> Fatura Kes") tek bir fonksiyon değil, bir **İş Akışı (Workflow)** olarak tasarlanır.
*   **Saga Prensibi:** Eğer "Ödeme Al" adımı başarısız olursa, sistem otomatik olarak "Stoğu Geri Yükle" (Compensate) adımını çalıştırır.
*   **Bizdeki Uygulama:** `generate-seo-post-workflow` iş akışı buna örnektir.
    1.  Adım 1: İçerik Üret (Gemini AI).
    2.  Adım 2: Blog Veritabanına Yaz.
    *   Eğer Yazma Başarısız Olursa -> Üretilen içeriği sil (Rollback).

---

## 🔢 3. BigNumber ve Hatasız Hesaplama
Finansal işlemlerde `0.1 + 0.2 = 0.300000000004` hatasına tahammülümüz yoktur.
*   **Kural:** Fiyat, Vergi ve Stok hesaplamalarında asla JavaScript `number` tipi doğrudan matematik işlemine sokulmaz.
*   **Araç:** Medusa'nın `BigNumber` yardımcıları veya `bignumber.js` kullanılır.
*   **Havuz Ajanı Notu:** Ajanın fiziksel hacim hesaplamaları (m3) `float` kullanabilir, ancak müşteriye fatura edilecek klor satış işlemleri kuruş hassasiyetiyle (`integer` tabanlı kuruş hesabı) yapılmalıdır.

---

## 🛠️ 4. Kurulum Rehberi (Start-to-Finish)

Projeyi ayağa kaldırmak için "Altın Sıra" (Golden Path):

### Faz 1: Altyapı (Infrastructure)
*   **Temizlik:** Eski `node_modules` ve `.medusa` klasörlerini "Sıfır Risk" prensibiyle silin.
*   **Başlatma:** `docker-compose up -d --build` komutunu çalıştırın.
*   **Detaylar:** **[`02_INSTALLATION_GUIDE.md`](./02_INSTALLATION_GUIDE.md)**

### Faz 2: Sırlar Odası (Configuration)
Sistemin çalışması için tek bir anahtar gereklidir.
*   **Dosya:** `.env`
*   **Anahtar:** `GEMINI_API_KEY`
*   **Önemi:** Blog ve Ajan modüllerinin can damarıdır.

### Faz 3: Geliştirme Kültürü (DevOps)
Sistem canlıdayken kod değişikliği yapmanın katı kuralları vardır (Zero-Risk Protocol).
*   **YASAK:** Host makinesinde `npm install` çalıştırılmaz.
*   **DÖNGÜ:** Kod Yaz -> Konteynerde Build Al -> Restart Et.
*   **Detaylar:** **[`03_ZERO_RISK_DEV_PROTOCOL.md`](./03_ZERO_RISK_DEV_PROTOCOL.md)**
*   **Entegrasyon:** AI Prompt Mühendisliği kuralları: **[`05_AI_INTEGRATION_GUIDE.md`](./05_AI_INTEGRATION_GUIDE.md)**

---

## 🔍 5. Sorun Giderme (Troubleshooting)

Eğer sistem yanıt vermiyorsa Baş Mimarın kontrol listesi:
1.  **Admin UI Beyaz Ekran:** `yarn build` eksik (Admin derlenmedi).
2.  **Erişim Reddedildi (ECONNREFUSED):** Konteyner henüz `Listening on 9000` durumuna gelmedi. Bekleyin.
3.  **AI Modeli Bulunamadı (404/Not Found):** API anahtarınız `gemini-1.5-flash` modeline yetkili değil veya bölge kısıtlaması var. (Sistem çökmez, 200 döner).
4.  **Veritabanı Senkronizasyonu:** Tablo eksikse -> `medusa db:migrate`.

---

> *"Bir mimar, sadece kodu değil, kodun yaşayacağı ekosistemi de tasarlar. Bu rehber, o ekosistemin haritasıdır."*
