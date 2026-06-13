---
description: Ajan İş Akışı Koordinatörü - Tüm ajanları yöneten merkezi sistem
---

# AJAN İŞ AKIŞI KOORDİNATÖRÜ (AGENT WORKFLOW COORDINATOR)

> ## ⚠️ DÜRÜSTLÜK NOTU — BU DOSYA ASPİRASYONELDİR (OTOMATİK ÇALIŞMAZ)
> Aşağıdaki 8 "uzman ajan" ve `/evrim-motoru`, `/denetle` gibi komutlar **manuel rol
> promptlarıdır** — bir insanın bir AI asistanına (Claude/Gemini) elle vermesi gereken
> yönergelerdir. Bunları otomatik çalıştıran **hiçbir runner, hook, CI adımı veya
> slash-handler YOKTUR**. "Her commit'te otomatik denetim" buradan değil, aşağıdaki
> GERÇEK geçitten gelir:
>
> **GERÇEK (atlanamaz) denetim mekanizması = deterministik program + CI:**
> - `scripts/audit/invariant-lint.mjs` — pre-commit hook'a bağlı, HATA'da commit'i reddeder.
> - `.github/workflows/ci.yml` — push/PR'da `audit:lint` + `audit:test` + `tsc` + `jest` (sunucu tarafı).
> - `scripts/audit/sealed.manifest.json` — mühürlü dosyalar değişince commit'i bloklar.
> - Protokol: `docs/AI-CALISMA-PROTOKOLU.md` ("Yaptım demek yasak, kanıt göster").
>
> Bu dosyadaki ekosistem, o gerçek geçidin üstüne bir gün otomasyon kurulursa yol haritasıdır.
> Aşağıdaki "Otomatik Tetikleme" iddialarını bu çerçevede oku.

Bu belge, PROJECT-AYNA-GENESIS projesi için tasarlanan (henüz manuel) uzman-ajan rol setini tanımlar.

## 🎯 Genel Bakış

Bu proje, sadece bir e-ticaret platformu değil, **kendi kendini yöneten, geliştiren ve iyileştiren otonom bir organizma** olarak tasarlanmıştır. Sistem, 8 farklı uzman ajandan oluşan bir ekip ile çalışır.

## 🏗️ Ajan Ekosistemi Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    EVRİM MOTORU (Çatı Ajan)                  │
│         "Otonom Özellik Üretimi ve Sistem İyileştirme"       │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ARAŞTIRMACI │    │ KOD DENETÇİSİ│   │   TEST MÜH.  │
│  Research    │    │  Code Audit  │    │  Test Eng.   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌──────────────┐              ┌──────────────┐
│  DEVOPS UZM. │              │ GÜVENLİK UZM.│
│  DevOps Eng. │              │ Security Eng.│
└──────────────┘              └──────────────┘
        │                           │
        └───────────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ DOKÜMANT.UZM.│ │   SEO UZM.   │ │  SİSTEM GÜNC.│
│ Docs Writer  │ │  SEO Expert  │ │ System Update│
└──────────────┘ └──────────────┘ └──────────────┘
```

## 🤖 Ajan Rolleri ve Sorumlulukları

### 1. EVRİM MOTORU (Evolution Engine) - Çatı Ajan
**Dosya:** `.agent/workflows/evrim-motoru.md`

**Sorumluluklar:**
- Müşteri taleplerinden otomatik özellik üretme
- Sistem hatalarını tespit edip kendi kendini iyileştirme
- Pazar ve SEO verilerine dayalı inovasyon
- Kod tabanını sürekli modernize etme

**Tetikleyici:** `/evrim-motoru` komutu

**Çıktı:** Doğrudan kod, mimari değişiklikler, yeni modüller

---

### 2. ARAŞTIRMACI (Researcher)
**Dosya:** `.agent/workflows/arastirmaci.md`

**Sorumluluklar:**
- Medusa v2, Next.js güncellemelerini takip
- Yeni teknolojileri ve best practice'leri araştırma
- Rakip analizleri ve pazar trendleri
- Teknik sorunlara çözüm önerileri

**Tetikleyici:** Evrim Motoru veya manuel araştırma talebi

**Çıktı:** Araştırma raporları, teknoloji önerileri

---

### 3. KOD DENETÇİSİ (Code Auditor)
**Dosya:** `.agent/workflows/kod-denetcisi.md`

**Sorumluluklar:**
- Kod kalitesi ve güvenlik denetimi
- Medusa v2 pattern uyumluluğu kontrolü
- Performans optimizasyonu önerileri
- Teknik borç tespiti

**Tetikleyici:** Her PR'da otomatik, veya manuel denetim talebi

**Çıktı:** Denetim raporları, düzeltme önerileri

---

### 4. TEST MÜHENDİSİ (Test Engineer)
**Dosya:** `.agent/workflows/test-muhendisi.md`

**Sorumluluklar:**
- Otomatik test senaryoları oluşturma
- Entegrasyon testleri yazma
- Edge case tespiti ve test coverage artırma
- Regression test suite yönetimi

**Tetikleyici:** Yeni özellik geliştirildiğinde

**Çıktı:** Test dosyaları, coverage raporları

---

### 5. DEVOPS UZMANI (DevOps Engineer)
**Dosya:** `.agent/workflows/devops-uzmani.md`

**Sorumluluklar:**
- Docker ve CI/CD pipeline yönetimi
- Performans monitoring ve alerting
- Altyapı optimizasyonu
- Deployment stratejileri

**Tetikleyici:** Altyapı değişiklikleri, performans sorunları

**Çıktı:** Dockerfile güncellemeleri, deployment scriptleri

---

### 6. GÜVENLİK UZMANI (Security Engineer)
**Dosya:** `.agent/workflows/guvenlik-uzmani.md`

**Sorumluluklar:**
- Güvenlik açıkları tespiti
- OWASP Top 10 uyumluluğu
- Veri gizliliği ve KVKK/GDPR uyumu
- Penetrasyon testleri

**Tetikleyici:** Güvenlik denetimi, yeni özellik geliştirme

**Çıktı:** Güvenlik raporları, düzeltme önerileri

---

### 7. DOKÜMANTASYON UZMANI (Documentation Writer)
**Dosya:** `.agent/workflows/dokumantasyon-uzmani.md`

**Sorumluluklar:**
- Teknik dokümantasyon güncelleme
- API referansları oluşturma
- Kullanım kılavuzları yazma
- Changelog yönetimi

**Tetikleyici:** Her özellik değişikliğinde

**Çıktı:** Güncellenmiş dokümantasyon, changelog entry'leri

---

### 8. SEO UZMANI (SEO Expert)
**Dosya:** `.agent/workflows/seo-uzmani.md`

**Sorumluluklar:**
- SEO optimizasyonu
- İçerik stratejisi geliştirme
- Anahtar kelime araştırması
- Performans metrikleri takibi

**Tetikleyici:** İçerik oluşturma, sayfa optimizasyonu

**Çıktı:** SEO önerileri, optimize edilmiş içerik

---

## 🔄 Çalışma Akışı (Workflow)

### Senaryo 1: Yeni Özellik Geliştirme

```
1. EVRİM MOTORU tetiklenir
   ↓
2. ARAŞTIRMACI'dan teknoloji araştırması ister
   ↓
3. KOD DENETÇİSİ mevcut kodu inceler, uyumluluk kontrolü yapar
   ↓
4. TEST MÜHENDİSİ test stratejisi oluşturur
   ↓
5. GÜVENLİK UZMANI güvenlik risklerini değerlendirir
   ↓
6. DEVOPS UZMANI deployment planı hazırlar
   ↓
7. EVRİM MOTORU kodu yazar
   ↓
8. TEST MÜHENDİSİ testleri çalıştırır
   ↓
9. DOKÜMANTASYON UZMANI dokümanları günceller
   ↓
10. SEO UZMANI SEO optimizasyonu yapar
   ↓
11. DEVOPS UZMANI production'a deploy eder
```

### Senaryo 2: Sistem İyileştirme (Self-Healing)

```
1. EVRİM MOTORU sistem hatalarını tespit eder
   ↓
2. ARAŞTIRMACI çözüm araştırır
   ↓
3. GÜVENLİK UZMANI güvenlik açısından değerlendirir
   ↓
4. KOD DENETÇİSİ mevcut kodu inceler
   ↓
5. EVRİM MOTORU yama kodunu yazar
   ↓
6. TEST MÜHENDİSİ regression testleri yapar
   ↓
7. DEVOPS UZMANI hotfix deploy eder
   ↓
8. DOKÜMANTASYON UZMANI değişiklikleri kaydeder
```

## 📊 Performans Metrikleri

Her ajan için takip edilen metrikler:

| Ajan | Metrikler |
|------|-----------|
| Evrim Motoru | Özellik sayısı, hata düzeltme süresi, ROI |
| Araştırmacı | Araştırma doğruluğu, öneri kabul oranı |
| Kod Denetçisi | Bulunan sorun sayısı, kritik hata tespit oranı |
| Test Mühendisi | Test coverage, bulunan bug sayısı |
| DevOps Uzmanı | Uptime, deployment süresi, hata oranı |
| Güvenlik Uzmanı | Bulunan açık sayısı, güvenlik skoru |
| Dokümantasyon Uzmanı | Dokümantasyon coverage, güncellik |
| SEO Uzmanı | SEO skoru, organik trafik artışı |

## 🛡️ Güvenlik ve Onay Mekanizmaları

### Kritik İşlemler İçin İnsan Onayı Gereklidir:
- Production database değişiklikleri
- Güvenlik açıkları düzeltmeleri
- Breaking changes içeren güncellemeler
- Maliyetli API çağrıları (Gemini, ödeme sistemleri)

### Otomatik İzin Verilen İşlemler:
- Dokümantasyon güncellemeleri
- Test eklemeleri
- Kod refactoring (test coverage korunuyorsa)
- Performans optimizasyonları

## 🚀 Başlatma Komutları

### Manuel Tetikleme:
```bash
# Evrim Motoru'nu başlat
/evrim-motoru "Yeni özellik öner"

# Araştırma iste
/arastir "Medusa v2'de yeni fulfillment API'leri"

# Kod denetimi yap
/denetle "src/modules/tenant"

# Test coverage artır
/test-et "src/api/admin/tenants"

# Güvenlik denetimi
/guvenlik-denetle "src/api"

# SEO optimizasyonu
/seo-optimize "storefront/src/app/[countryCode]/products"

# Dokümantasyon güncelle
/dokumante-et "src/modules/tenant"

# DevOps iyileştirmesi
/devops-iyilestir "docker-compose.yml"
```

### Otomatik Tetikleme (HEDEF — henüz uygulanmadı):
> ⚠️ Aşağıdakiler **planlanmış** otomasyonlardır; şu an OTOMATİK ÇALIŞMAZ. Bugün gerçekten
> otomatik olan tek şey, `.github/workflows/ci.yml` ve pre-commit hook'taki deterministik
> denetimdir (kod/izolasyon/mühür/tip/test geçitleri). Aşağıdaki AI-ajan tetikleyicileri
> bir orkestratöre bağlanana kadar yalnızca manuel taleple çalışır.
- (Hedef) Her commit'te: AI kod denetimi, test coverage yorumu
- (Hedef) Her feature branch'te: Güvenlik taraması, SEO değerlendirmesi
- (Hedef) Haftalık: Sistem performansı analizi, teknik borç raporu
- (Hedef) Aylık: Teknoloji güncellemesi, rakip analizi

## 📈 Gelecek Geliştirmeler

### Phase 1: Temel Entegrasyon (Mevcut)
- ✅ 8 ajan rol tanımı
- ✅ Manuel tetikleme komutları
- ✅ Temel workflow koordinasyonu

### Phase 2: Otomasyon (Planlanıyor)
- [ ] GitHub Actions ile CI/CD entegrasyonu
- [ ] Otomatik PR review bot
- [ ] Performance monitoring dashboard
- [ ] Otomatik changelog generation

### Phase 3: İleri Seviye (Gelecek)
- [ ] Machine learning ile hata tahmini
- [ ] Otomatik A/B testing framework
- [ ] Multi-tenant özelleştirme motoru
- [ ] Real-time collaboration tools

## 🎯 Başarı Kriterleri

Bir ajan iş akışının başarılı sayılması için:

1. **Medusa v2 Uyumluluğu:** Tüm kod Medusa v2 pattern'larına uygun
2. **Test Coverage:** Minimum %80 test coverage
3. **Güvenlik:** OWASP Top 10'da açık yok
4. **Performans:** Sayfa yükleme süresi < 3 saniye
5. **SEO:** Lighthouse SEO skoru > 90
6. **Dokümantasyon:** Tüm değişiklikler dokümante edilmiş
7. **Multi-Tenant:** Her özellik tenant izolasyonuna sahip

## 📚 Referanslar

- [00_SUPREME_LAW.md](../../docs/GENESIS_PROTOCOL/00_SUPREME_LAW.md) - Proje anayasası
- [08_ARCHITECTURE_SEAL.md](../../docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md) - Mühürlü alanlar
- [15_DEVELOPER_ONBOARDING.md](../../docs/GENESIS_PROTOCOL/15_DEVELOPER_ONBOARDING.md) - Geliştirici rehberi

---

**Son Güncelleme:** 2026-06-14  
**Durum:** ASPİRASYONEL (manuel rol promptları — otomatik orkestrasyon YOK)  
**Gerçek enforcement:** `scripts/audit/invariant-lint.mjs` + `.github/workflows/ci.yml`  
**Sorumlu:** Evrim Motoru (Çatı Ajan — manuel tetikleme)