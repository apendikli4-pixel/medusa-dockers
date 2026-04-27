# GENESIS PROTOCOL: AUTONOMOUS INTELLIGENCE (12)
> **Author:** Ayna AI / Genesis Core  
> **Last Updated:** 2026-03-21  
> **Status:** ACTIVE - Enterprise Grade

Bu doküman, PROJECT-AYNA-GENESIS mimarisine eklenen otonom zekâ katmanlarını, stok tahminleme motorunu ve stratejik içerik üretim süreçlerini tanımlar.

---

## 🧠 1. Mimari Genel Bakış: Kendi Kendini Yöneten Mağaza
Genesis mimarisi, insan müdahalesine olan ihtiyacı minimize eden üç ana otonom sütun üzerine inşa edilmiştir:
1. **Inventory Intelligence (Stok Zekâsı):** Satış hızını analiz eder, geleceği tahmin eder.
2. **Content Intelligence (İçerik Zekâsı):** Stratejik ürünleri belirler, SEO odaklı pazarlama yapar.
3. **Diagnostic Intelligence (Tanılama Zekâsı):** Sistem hatalarını bulur ve otonom onarır.

---

## 📦 2. Inventory Intelligence (Stok Tahminleme)
Sistem, `AynaStockIntelligenceService` üzerinden geçmiş 30 günlük veriyi analiz ederek "Stok Ömrü" (Days Remaining) hesabı yapar.

### Mekanizma:
- **Analiz Periyodu:** Günlük (Her sabah 09:00).
- **Algoritma:** `Mevcut Stok / (Son 30 Günlük Satış / 30) = Kalan Gün`.
- **Aksiyon:** Kalan gün < 7 ise otomatik **Mission (Görev)** oluşturulur.

---

## ✍️ 3. Content Intelligence (Stratejik İçerik)
`AynaContentIntelligenceService`, rastgele içerik üretmek yerine envanter verimliliğini maksimize edecek ürünleri seçer.

### Seçim Kriterleri:
- Stoğu yüksek olan ürünler (Satış ivmesi kazandırılması gerekenler).
- Mevsimsel trendlere uygun kategoriler.
- Yüksek marjlı "Hero" ürünler.

### Çıktı:
- Her Pazar gecesi otonom olarak üretilen SEO uyumlu, iç linklemeleri yapılmış blog yazıları.

---

## 🛠️ 4. Diagnostic & Self-Healing (Kendi Kendini Onarma)
`AynaDiagnosticService`, sistemdeki link kopukluklarını ve bölge (region) hatalarını tarar.

### Yetenekler:
- `system_audit`: Tüm sistemi tarar ve rapor sunar.
- `system_auto_fix`: Tespit edilen link ve konfigürasyon hatalarını otomatik düzeltir.
- **Archive Policy:** Eski ve dağınık script dosyaları `src/scripts/archive` altında izole edilerek kod temizliği korunur.

---

## 👁️ 5. Vision AI (Görsel Zeka)
Gemini 1.5 Flash entegrasyonu sayesinde Ayna, müşteri fotoğraflarını analiz edebilir.
- **Kullanım:** Yedek parça bulma, ürün tanıma, etiket okuma.
- **Entegrasyon:** `AynaChatService` üzerinden doğrudan Vision desteği.

---
*Bu doküman Genesis Protokolü'nün bir parçasıdır. Otonom sistemler tarafından güncellenmiştir.*
