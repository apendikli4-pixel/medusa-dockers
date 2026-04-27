# 🔒 GENESIS PROTOCOL: HUKUKI UYUM REHBERİ (09)
> **Compliance Guide - GDPR & AI Act Uyumluluğu**
> **Versiyon:** 1.0
> **Son Güncelleme:** 2026-02-09
> **Durum:** 🟢 AKTİF

---

## 📜 Genel Bakış

AYNA GENESIS mimarisi, global hukuki düzenlemelere **tasarım aşamasından itibaren** uyumlu olarak inşa edilmiştir. Bu belge, mevcut yapının hangi yasal gereklilikleri nasıl karşıladığını açıklar.

---

## 🇪🇺 GDPR (Genel Veri Koruma Yönetmeliği) Uyumu

### Madde 22: Otomatik Karar Alma Şeffaflığı

| Gereklilik | AYNA'nın Karşılığı |
|------------|-------------------|
| Otomatik kararların açıklanabilir olması | `memory_conscience` - LLM tarafından üretilen doğal dilde gerekçelendirme |
| İnsan müdahalesi hakkı | `Mission` Sistemi - Tüm kritik otonom kararlar insan onayı bekler |
| Karar Loglama | `memory_truth` - Her adımın teknik ve etik kanıtı |

### Madde 35: Veri Koruma Etki Değerlendirmesi (DPIA)

AYNA'nın `memory_truth` tablosu, tüm sistem olaylarını kaydederek:
- **Veri işleme akışını** tam olarak izlemeyi
- **Hangi verinin ne zaman işlendiğini** belgelemeyi
- **Risk değerlendirmesi** için gerekli kanıtları sağlar

---

## 🤖 EU AI Act Uyumu (Peak 2.0 Standardı)

### Yüksek Riskli AI Sistemleri Gereklilikleri

| Gereklilik | AYNA'nın Karşılığı |
|------------|-------------------|
| **Explainable AI** | `ConscienceService` artık sadece "Evet/Hayır" demez; nedenini Gemini LLM ile detaylı açıklar. |
| **Risk Yönetimi** | `Mission` katmanı ile otonom riskler minimize edilir. |
| **İnsan Gözetimi** | Admin Dashboard / Missions sekmesi ile %100 kontrol. |

### Uyum Tablosu

```
┌────────────────────────────────────────────────────────────────┐
│                    AI ACT MAPPING                              │
├────────────────────────────────────────────────────────────────┤
│  memory_truth      → Makine Okunabilir Kayıtlar (Article 14)  │
│  memory_insight    → Şeffaflık Yükümlülüğü (Article 13)       │
│  memory_conscience → Risk Değerlendirmesi (Article 9)         │
└────────────────────────────────────────────────────────────────┘
```

---

## 📊 Veritabanı Tabloları ve Hukuki Karşılıkları

### 1. `memory_truth`
**Hukuki Rol:** Denetim İzi (Audit Trail)
- Her sistem olayını değiştirilemez şekilde kaydeder
- `created_at` timestamp ile yasal zaman damgası
- GDPR Article 5(2) - Hesap verebilirlik ilkesi

### 2. `memory_insight`
**Hukuki Rol:** Karar Şeffaflığı
- AI'ın öğrenme sürecini belgeler
- `source` alanı ile bilgi kaynağını izler
- AI Act Article 13 - Şeffaflık gereksinimi

### 3. `memory_conscience`
**Hukuki Rol:** Etik Değerlendirme
- Kritik kararların etik incelemesi
- `verdict` + `reasoning` ile karar gerekçesi
- AI Act Article 9 - Risk yönetim sistemi

---

## 🔐 Veri Export API'si (Kullanıcı Hakları)

GDPR Madde 20 kapsamında veri taşınabilirliği için:

```typescript
// GET /admin/compliance/export?entity_id=user_123
// Kullanıcıya ait tüm kayıtları JSON formatında döner
```

> **Not:** Bu API henüz implemente edilmemiştir. Sonraki fazda eklenecektir.

---

## ✅ Uyum Kontrol Listesi (Peak 2.0 Güncellemesi)

- [x] Karar kayıtları (memory_truth) - Aktif
- [x] Şeffaflık mekanizması (Explainable Conscience) - Aktif
- [x] Otonom Görev Denetimi (Missions) - Aktif
- [x] Admin gözetim paneli (System Health + AI Stats) - Aktif
- [x] Self-healing mekanizması - Aktif
- [ ] Veri export API'si - Planlandı
- [ ] Otomatik silme (retention policy) - Planlandı

---

## 📝 Yasal Sorumluluk Reddi

Bu belge, hukuki tavsiye niteliği taşımaz. Spesifik yasal uyumluluk gereksinimleri için yetkili hukuk danışmanına başvurunuz.

---

> **"Şeffaflık, güvenin temelidir."** - Genesis Protocol
