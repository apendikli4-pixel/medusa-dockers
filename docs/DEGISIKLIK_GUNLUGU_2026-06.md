# Değişiklik Günlüğü — Haziran 2026

> Sonraki geliştiriciler ve AI modelleri için. Bu dosya, Haziran 2026'da yapılan
> gerçek (depoda doğrulanabilir) değişiklikleri ve kritik mimari kuralları özetler.
> Her madde commit'iyle izlenebilir — burada yazmayan bir "tamamlandı" iddiasına
> güvenmeden önce `git log` ve dosya sistemini kontrol edin.

## Kritik mimari kurallar (değiştirmeden önce oku)

1. **Mağaza kimliği = TENANT, sales-channel değil.** Sektör bilgisi, AI araç
   seçimi, ürün-mağaza bağlama hep `modules/tenant` üzerinden yürür. Backend
   tenant'ı `x-tenant-id` (en yüksek öncelik) veya `x-tenant-slug` HEADER'ından
   çözer (`src/api/middlewares/tenant-context.ts`). **Body'ye `store_id` koymak
   işe yaramaz** — route şemaları onu okumaz.
2. **Storefront Next middleware `/api` rotalarını ATLAR.** Bu yüzden her
   `/api/*` proxy'si `backendProxyHeaders()` kullanmak ZORUNDA
   (`storefront/src/lib/server/proxy-headers.ts`) — slug Host'tan türetilir.
   Yeni proxy eklerken bu yardımcıyı kullan.
3. **Müşteriye/yöneticiye dönen TÜM metinler Türkçe** (fallback ve rate-limit
   mesajları dahil).
4. **JSON-LD'de sahte veri YASAK.** `aggregateRating` yalnızca gerçek onaylı
   yorumlardan üretilir (`getProductReviewStats`), yorum yoksa alan atlanır.
5. **Sektör kuralları tek kaynak:** `src/lib/sector-framework/` (registry
   deseni). Yeni sektör = yeni `sectors/<kod>.ts` + `SECTOR_CODES` + tenant
   `VALID_SECTORS` + storefront `SECTOR_THEMES`. Kayıtsız sektör `retail`
   varsayılanına düşer (`TenantService.getSectorConfig`).
6. **`glass-header`'ın `backdrop-filter`'ı `position:fixed` torunları
   header'a hapseder.** Tam ekran overlay'ler `createPortal(…, document.body)`
   ile body'ye taşınmalı (bkz. `MobileMenu.tsx`).

## Haziran 2026 değişiklikleri (commit sırasıyla)

| Commit | Özet |
|---|---|
| `f6e5d21` | Ürün JSON-LD'sindeki `Math.random()` sahte aggregateRating kaldırıldı; gerçek yorum istatistiği (`getProductReviewStats`) bağlandı. |
| `b8790d0` | Chat AI mağazaya gerçekten bağlandı: chat proxy `x-tenant-slug` iletir; guardian prompt mağaza kimliğini Tenant Context'e bağlar; `search_products` açıklamasındaki havuz sızıntısı temizlendi. |
| `bc0e02c` | Mobil yatay taşma giderildi. |
| `b9b3690` | Mobil menü (hamburger + çekmece, portal'lı) ve mobil arama; TÜM `/api` proxy'lerine tenant slug (`backendProxyHeaders`); villa rezervasyon bloğu sunucu tarafı sektör koşuluna geçti (eski `group-[html[data-sector]]` seçicisi geçersizdi). |
| `145035d` | Uzak main'e başka bir AI agent'ın ittiği 8 commit onarıldı: derlenmiyordu (13 tip hatası) ve chat route'taki tanımsız `isHealthy()` çağrısı chat'i %100 susturuyordu. Bozuk vitest test dosyaları silindi; İngilizce müşteri metinleri Türkçeleştirildi. |
| `b1287d7` | Admin Ayna Asistan'a mağaza (tenant) seçici: `/admin/tenants` listesi + `x-tenant-id` header'ı; mağaza seçilmeden komut çalışmaz. |
| (bu commit) | Sector-framework'e `vape` ve `pool` profilleri eklendi (canlı iki mağazanın sektörleri kayıtsızdı, retail'e düşüyordu). Vape: 18+ yaş doğrulama + sağlık uyarısı zorunlu, loyalty kapalı. Pool: teknik özellik alanları beklenir. Yeni kurallar: `requiresAgeVerification`, `minimumAge`, `healthWarningRequired`, `technicalSpecsRequired`. |

## Bilinen durumlar / tuzaklar

- **GitHub hesabı faturalama kilidi** (Haziran 2026): Actions CI hiç çalışmıyor
  ("account is locked due to a billing issue"). Çözülene kadar push öncesi
  yerel doğrulama ZORUNLU: kökte `npx tsc --noEmit` + `storefront`'ta
  `npx next build`.
- **Dış AI agent çıktılarına güven kontrolü:** Haziran'da bir cloud agent'ın
  "tamamlandı" dediği işlerin çoğu depoya hiç ulaşmadı (sandbox'ı disk-dolu
  hatasındaydı); ulaşan 8 commit ise derlenmiyordu. Dışarıdan gelen her işi
  `git log` + derleme + test ile doğrulayın.
- Deploy sonrası site 504 verirse: `docker restart coolify-proxy` (Traefik
  stale upstream). Coolify env'inde `TENANT_PRODUCT_ISOLATION=false`
  OLMAMALI (AI ürün izolasyonunu kapatır).
- Henüz yapılmadı (aday işler): Meilisearch entegrasyonu; backend faq/contact
  endpoint'lerinin tenant-bazlı hale getirilmesi; kullanılmayan `pool-agent`
  endpoint'inin kaldırılması veya tenant'a bağlanması; storefront AgeGate'in
  sector-framework `requiresAgeVerification` bayrağından beslenmesi.
