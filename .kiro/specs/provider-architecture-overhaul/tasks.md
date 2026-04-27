# Uygulama Planı

<!-- ============================================================
     BÖLÜM A: PRODUCTION BLOCKER'LAR
     ============================================================ -->

## A. Production Blocker'lar

- [x] 1. Hata Koşulu Keşif Testi — Hardcoded IP (PayTR & İyzico)
- [x] 2. Koruma Testi — Mevcut Ödeme Akışı Davranışı (DÜZELTME ÖNCESİ)
- [x] 3. IP Adresi Düzeltmesi — PayTR & İyzico
  - [x] 3.1 `src/utils/get-client-ip.ts` yardımcı fonksiyonunu oluştur
  - [x] 3.2 `src/providers/paytr/provider.ts` içinde IP düzeltmesini uygula
  - [x] 3.3 `src/providers/iyzico/provider.ts` içinde IP düzeltmesini uygula
  - [x] 3.4 Keşif testinin artık geçtiğini doğrula
  - [x] 3.5 Koruma testlerinin hâlâ geçtiğini doğrula
- [x] 4. Hata Koşulu Keşif Testi — Sahte Takip Numarası (Yurtiçi)
- [x] 5. Koruma Testi — Mock Mod Davranışı (DÜZELTME ÖNCESİ)
- [x] 6. Yurtiçi Mock/Production Ayrımı Düzeltmesi
  - [x] 6.1 `src/providers/yurtici/service.ts` içinde mock/production ayrımını uygula
  - [x] 6.2 Keşif testinin artık geçtiğini doğrula
  - [x] 6.3 Koruma testlerinin hâlâ geçtiğini doğrula
- [x] 7. Checkpoint A — Production Blocker Testleri

<!-- ============================================================
     BÖLÜM B: KISA VADELİ SORUNLAR
     ============================================================ -->

## B. Kısa Vadeli Sorunlar

- [x] 8. Hata Koşulu Keşif Testi — AynaService container as any
- [x] 9. Koruma Testi — AynaService Fonksiyonel Davranış (DÜZELTME ÖNCESİ)
- [x] 10. AynaService remoteQuery Refactor
  - [x] 10.1 Constructor'daki `(container as any)` servis çözümleme bloğunu kaldır
  - [x] 10.2 `executeProductSearch` ve `executeInventoryCheck` metodlarını remoteQuery ile güncelle
  - [x] 10.3 Keşif testinin artık geçtiğini doğrula
  - [x] 10.4 Koruma testlerinin hâlâ geçtiğini doğrula
- [x] 11. ContentEngine Gerçek Entegrasyonu
  - [x] 11.1 `executeCreateBlogPost` metodunu gerçek ContentEngineService entegrasyonu ile güncelle
  - [x] 11.2 Entegrasyon testini çalıştır
- [x] 12. Mission Onay Admin UI Sayfası
  - [x] 12.1 `src/admin/routes/missions/page.tsx` dosyasını oluştur
  - [x] 12.2 Onay butonu ve `executeMission()` entegrasyonu ekle
  - [x] 12.3 Mission akışını uçtan uca test et
- [x] 13. Checkpoint B — Kısa Vadeli Testler

<!-- ============================================================
     BÖLÜM C: TEKNİK BORÇ
     ============================================================ -->

## C. Teknik Borç

- [x] 14. LangChain → Gemini Native Paradigma Geçişi
  - [x] 14.1 `src/lib/agents/pool-calculator.ts` içindeki LangChain araçlarını analiz et
  - [x] 14.2 LangChain araçlarını Gemini native function declaration formatına dönüştür
  - [x] 14.3 LangChain bağımlılığını kaldır
  - [x] 14.4 Havuz hesaplama aracının Gemini native ile çalıştığını doğrula
- [x] 15. `@ts-ignore` Kaldırma ve Tip Güvenliği
  - [x] 15.1 `AynaService` içindeki tüm `@ts-ignore` direktiflerini tespit et
  - [x] 15.2 MedusaService CRUD metodları için tip tanımları ekle
  - [x] 15.3 BigNumber operasyonları için tip güvenliği sağla
  - [x] 15.4 TypeScript derleme hatası olmadığını doğrula
- [x] 16. Workflow Compensation Adımları
  - [x] 16.1 `src/workflows/generate-content.ts` içine compensation adımları ekle
  - [x] 16.2 `src/workflows/track-order-placed.ts` içine compensation adımları ekle
  - [x] 16.3 Workflow hata senaryolarını test et
- [x] 17. Checkpoint C — Teknik Borç Testleri
- [x] 18. Final Checkpoint — Tüm Testler
