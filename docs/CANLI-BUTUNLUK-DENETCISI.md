# Canlı Bütünlük Denetçisi (Runtime Integrity Monitor)

> Organizmanın kalp atışı. Derleme-zamanı invariant geçidinin (pre-commit + CI) **çalışma-zamanı
> ikizidir**: orada "bozuk kod giremez", burada "bozulmuş canlı durum sessiz kalmaz ve mümkünse
> kanıtlı şekilde onarılır".

## Ne işe yarar?
Canlı sistemin mimari değişmezlerini **deterministik** kontrol eder, sonucu **dürüstçe** raporlar
(sahte-yeşil yok — doğrulanamayan kontrol `SKIPPED`), güvenli sorunları **kanıtlayarak** onarır.

## Nasıl görürüm? (operatör)
- **Admin paneli:** Sol menü → **Bütünlük Denetçisi**. Genel durum + her kontrol + "Güvenli Onarımı
  Çalıştır" düğmesi. (Sayfa: `src/admin/routes/integrity/page.tsx`)
- **API:** `GET /admin/system-health/integrity` → tam karar (JSON). Genel durum `FAIL` ise HTTP **503**.
- **Saatlik kalp atışı:** `src/jobs/integrity-heartbeat.ts` her saat çalışır; sonucu vicdan/hafıza
  günlüğüne (`integrity_heartbeat`) yazar — "Sistem Sağlığı" panelindeki son aktivitelerde görünür.
  `FAIL` olursa sunucu loglarına `logger.error` ile yüksek-görünürlüklü uyarı düşer.

## Şu an denetlenen değişmezler
| id | Ne doğrular | Sorunda |
|----|-------------|---------|
| `database` | Veritabanı sorguya yanıt veriyor mu | FAIL |
| `tenants-present` | En az bir mağaza (tenant) var mı | WARN |
| `search-isolation` | Meili `products` indeksinde `sales_channel_ids` filtrelenebilir mi (tenant sızıntı riski) | **FAIL** (+ güvenli onarıcı) |
| `regions-configured` | Checkout için bölge var mı | FAIL |
| `shipping-configured` | Kargo seçeneği var mı | WARN |
| `ai-provider` | Ollama (`OLLAMA_API_URL`) yapılandırılmış mı | WARN |

## Öz-onarım (self-healing) — altın kural
Bir onarım **"düzeltildi" sayılması için, onarımdan SONRA kontrol yeniden çalıştırılıp GEÇMELİDİR.**
Sahte "onarıldı" imkânsızdır. Çözülemeyen girişimler dürüstçe `unresolved` raporlanır.

- **Güvenlik:** yalnızca `safeToAutoHeal` (idempotent, yıkıcı olmayan) onarıcılar otomatik koşar.
  Veri silen/taşıyan onarımlar asla otomatik çalışmaz — "insan onayı gerekir" diye işaretlenir.
- **Otomatik onarım** varsayılan **KAPALI**dır (prod'da sessiz mutasyon yapmaz). Açmak için sunucu
  ortamında: `INTEGRITY_AUTOHEAL=true`. Kapalıyken onarım yalnızca admin panelindeki düğme veya
  `POST /admin/system-health/integrity/heal` ile (manuel) tetiklenir.
- **İlk onarıcı:** `search-isolation` → Meili `products` indeks ayarlarını yeniden uygular
  (kaynak: `src/lib/search/product-index-settings.ts` — kurulum script'i de aynı kaynağı kullanır).

## Yeni bir kontrol/onarıcı nasıl eklenir? (geliştirici)
1. `src/lib/integrity/checks.ts` içine bir `Check` ekle: `run(ctx)` bir `CheckResult` döndürür.
   Doğrulayamıyorsan `OK` deme → `SKIPPED` de. Gerçek sorunda `FAIL`/`WARN`.
2. Güvenli (idempotent) onarılabiliyorsa `safeToAutoHeal: true` + `heal(ctx)` ekle. `heal` yalnızca
   değişikliği uygular; doğrulamayı çerçeve (heal.ts) yeniden-kontrolle yapar.
3. `DEFAULT_CHECKS` dizisine ekle.
4. `src/lib/integrity/__tests__/` altına doğru-pozitif **ve** doğru-negatif test yaz → `npm run audit:test` ve `npx jest src/lib/integrity`.

## Mimari (tek bakışta)
```
src/lib/integrity/
  types.ts       # Check, CheckResult, IntegrityVerdict, HealResult
  checks.ts      # gerçek kontroller (+ güvenli onarıcılar)
  aggregate.ts   # saf karar mantığı (FAIL>WARN>OK; hepsi SKIPPED→SKIPPED)
  run.ts         # kontrolleri izole çalıştırır (istisna→FAIL güvenlik ağı)
  heal.ts        # onar→yeniden-doğrula→yalnızca geçerse 'fixed'
src/jobs/integrity-heartbeat.ts                 # saatlik kalp atışı (+opt-in oto-onarım)
src/api/admin/system-health/integrity/route.ts  # GET durum
src/api/admin/system-health/integrity/heal/route.ts  # POST manuel onarım
src/admin/routes/integrity/page.tsx             # operatör paneli
```

## İlgili
- Derleme-zamanı geçidi: `docs/AI-CALISMA-PROTOKOLU.md`, `scripts/audit/invariant-lint.mjs`
- Mühürlü dosyalar: `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md`, `scripts/audit/sealed.manifest.json`
