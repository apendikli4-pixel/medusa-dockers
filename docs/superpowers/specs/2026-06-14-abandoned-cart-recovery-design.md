# Terk Edilmiş Sepet Kurtarma — Tasarım Dokümanı (v1)

**Tarih:** 2026-06-14
**Durum:** Onaylandı (brainstorming) → uygulamaya hazır
**Kapsam:** v1 — tek hatırlatma, ~4 saat sonra, indirimsiz, sade

## 1. Problem & Değer
Ziyaretçilerin çoğu sepeti terk eder. Tek bir iyi-zamanlanmış hatırlatma e-postası, terk edilen
sepetlerin önemli bir kısmını geri kazandırır (e-ticaretin en yüksek ROI'li özelliklerinden).
Mevcut üründe **yok** (boşluk doğrulandı). Brevo e-posta altyapısı + cron job deseni hazır.

## 2. Ürün Kararları (Mustafa onayı)
- **Zamanlama:** Tek hatırlatma, sepet ~4 saat hareketsizse.
- **Pencere:** 4–48 saat (yeterince eski = terk; çok eski = bayat, gönderme).
- **Teşvik:** Yok — sade hatırlatma (marj korunur, müşteri yanlış eğitilmez).
- **Dedup:** Aynı sepete bir kez gönderilir.

## 3. Mimari (mevcut `order-placed` subscriber deseniyle birebir)

### 3.1 Saf çekirdek — `src/lib/abandoned-cart/candidate.ts`
- `isAbandonedCandidate(cart, now, opts): { eligible, reason }` — DB'siz, saf, deterministik.
  - Kurallar: `completed_at` null + `email` dolu + en az 1 item + `updated_at` [now-maxAge, now-minAge]
    aralığında + `metadata.abandoned_reminder_sent_at` YOK.
  - `opts = { minAgeMs (4s), maxAgeMs (48s) }` — env ile ayarlanabilir.
- `buildReturnToCartUrl(baseUrl, cartId)` — "sepete dön" linki.
- Tam birim test edilir (pencere sınırları, dedup, eksik email/item).

### 3.2 Job — `src/jobs/abandoned-cart-recovery.ts` (cron: her 30 dk)
1. Aday sepetleri çek (`completed_at: null`, email dolu, updated_at penceresi) — remoteQuery.
2. Her aday: `isAbandonedCandidate` ile filtrele (saf çekirdek).
3. Tenant çöz (ilk ürün → tenant link; `order-placed` ile aynı yöntem) → `getStoreConfig(tenant)`.
4. Şablon: `storeConfig.email.templates.abandonedCart` → env `BREVO_ABANDONED_CART_TEMPLATE_ID` → atla.
5. `notificationModuleService.createNotifications({ to, channel:"email", template, data })`.
6. Cart `metadata.abandoned_reminder_sent_at = now` (dedup işareti).
7. Her sepet kendi `try/catch`'inde; dürüst loglama (gönderilen/atlanan/hatalı sayıları).

### 3.3 StoreConfig genişletmesi
`tenant.settings.storefront.email.templates.abandonedCart` (tenant-özel Brevo şablon ID'si).
Tip tanımı (`store-config.ts`) güncellenir; yoksa env fallback, o da yoksa o tenant atlanır (uyarı).

## 4. Veri Akışı
`cron → aday sepetler → (saf) filtre → tenant çöz → StoreConfig şablon → Brevo e-posta → metadata işaretle`

## 5. Edge-Case'ler (fail-safe, dürüst)
| Durum | Davranış |
|------|----------|
| Email yok | Atla (gönderilecek adres yok) |
| Tenant/şablon çözülemiyor | Atla + uyarı (yanlış markayla GÖNDERME) |
| Ürün silinmiş | Atla |
| Zaten hatırlatılmış | Atla (idempotent dedup) |
| Çok-tenant | Her sepet KENDİ tenant'ının markasıyla (sızıntı yok) |
| Bir sepet patlarsa | Diğerleri devam (per-cart try/catch) |

## 6. Test Stratejisi
- **Birim (saf çekirdek):** 3s59dk→hayır, 4s01dk→evet, 49s→hayır, dedup→hayır, email-yok→hayır, item-yok→hayır.
- **Şablon çözümü:** StoreConfig → env → (yoksa) atla sıralaması.
- Job ince orkestratör: saf çekirdeği çağırır; ağır DB testi yok.

## 7. YAGNI — Bilinçli Dışarıda Bırakılanlar
İkinci hatırlatma, indirim kodu, A/B test, SMS kanalı. Mimari genişletmeye açık; v1 sade.

## 8. Dosya Listesi
- `src/lib/abandoned-cart/candidate.ts` (yeni, saf)
- `src/lib/abandoned-cart/__tests__/candidate.spec.ts` (yeni, test)
- `src/jobs/abandoned-cart-recovery.ts` (yeni, job)
- `src/modules/tenant/store-config.ts` (tip genişletme — küçük)
- `docs/...` (operasyon notu, opsiyonel)
