# AI ÇALIŞMA PROTOKOLÜ — "Yaptım" Demek Yasak, Kanıt Göster

> Bu projeyi üzerine kuran ilke **dürüstlük**tir. Aynı ilke kodu yazan AI için de
> geçerlidir: **bir AI'ın "yaptım / tamamlandı / çalışıyor" demesi bir RAPOR değil,
> bir TAHMİN'dir.** Bu yüzden burada sözle değil, **kanıtla** çalışılır. Bu kural
> Antigravity, Claude, Cursor — fark etmez, projede kod üreten HER AI için bağlayıcıdır.

---

## 0. Altın Kural

**"Yaptım" tek başına geçersizdir. Her iddianın yanında, o iddiayı kanıtlayan KOMUT
ÇIKTISI olmalıdır.** Çıktı yoksa, iş yapılmamış sayılır. Yeşil tik yoksa, "çalışıyor"
denemez.

Yanlış: *"Tenant izolasyonunu ekledim, çalışıyor."*
Doğru: *"Ekledim. Kanıt: `npm run audit:full` → 0 HATA; `jest` → 19 suite / 166 test, exit 0 (çıktı aşağıda)."*

---

## 1. Görev Başına "Bitti" Tanımı (Definition of Done)

Bir görev, ancak aşağıdakilerin **hepsinin çıktısı yapıştırıldığında** "bitti"dir:

```bash
# 1) Deterministik mimari denetim (kandırılamaz geçit)
npm run audit:lint           # 0 HATA olmalı (uyarılar bilgilendirme)
npm run audit:test           # denetçinin kendi kuralları yeşil (regresyon yok)

# 2) Tip güvenliği — backend + storefront
npx tsc --noEmit -p tsconfig.json          # exit 0
cd storefront && npx tsc --noEmit          # exit 0

# 3) Testler
npx jest --silent            # 0 başarısız

# 4) (Önizlemeli değişiklikse) gerçek davranış kanıtı
#    ekran görüntüsü / curl çıktısı / log — "ekranda gördüm" yetmez
```

> Aynı geçitler `.github/workflows/ci.yml` ile **sunucu tarafında** (push/PR) tekrar koşar:
> `audit:lint` + `audit:test` + `tsc` + `jest` (backend) ve `tsc` + `build` (storefront).
> Yani pre-commit `--no-verify` ile atlansa bile bozuk kod main'e giremez.

Her görev mesajının sonuna **bu komutların gerçek çıktısı** eklenir. Çıktı uydurulamaz;
uydurursa bir sonraki adımda yakalanır (commit geçidi + bağımsız denetim).

---

## 2. Görevleri KÜÇÜK ve tek tek doğrulanabilir tut

Büyük "şu modülü baştan kur" görevleri, AI'ın parçaları sessizce atlamasına izin verir.
Her görev, sonunda tek bir yeşil/kırmızı geçitle biten küçük bir dilim olmalı. "Hepsini
yaptım" yerine "1. adım: X — kanıt; 2. adım: Y — kanıt".

---

## 3. Commit geçidi otomatiktir — atlanamaz

`git config core.hooksPath .githooks` aktiftir. Her commit'te
`scripts/audit/invariant-lint.mjs` staged dosyaları tarar. **HATA varsa commit fiziksel
olarak reddedilir.** Bu, AI'ın dürüst olup olmamasından bağımsızdır — bozuk kod geçemez.

- Bilinçli istisna gerekiyorsa: ilgili satıra `// audit-ignore: <kural-id>` + **gerekçe**.
- `git commit --no-verify` ile atlamak YASAK (iz bırakır, güveni bozar).

Yakalanan kurallar (hepsi geçmişte yediğimiz gerçek hatalardan): sızdırılmış secret,
sabit/zayıf parola, SEO'da `Math.random()` (sahte puan), migration'da `slug='default'`
varsayımı, placeholder veri (IBAN/e-posta), markaya-özel hardcode (StoreConfig ihlali),
`sector===`/`isVape` ile içerik seçimi, istek-başına bağlantı havuzu, `as any`, **tenant
izolasyon bypass'ı** (`tenantIsolation:false`, `.disableFilter`, `__system__`,
`app.current_tenant_id` — tenant modülü dışında), **değişmez hafıza sert-silme**
(`deleteMemory*`, `DELETE FROM memory_*` — arşivleyici job dışında), **mühür kırma**
(`@sealed` dosya değişip `sealed.manifest.json` güncellenmemiş).

**Mühürlü dosya değiştirdiysen:** `npm run audit:seal` çalıştır (mührü yeniler) ve
`docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md`'yi güncelle — yoksa commit bloklanır.

---

## 4. Dürüstlük zorunlulukları (bu projeye özel)

- **Asla uydurma:** ürün/fiyat/stok yoksa "yok" de; vektör/arama 0 sonuç dönerse
  "ürün yok" deme, gerçek kataloğa düş. Kullanıcıya gösterilen her sayı gerçek olmalı.
- **Mağazaya-özel her değer** `tenant.settings.storefront` (StoreConfig)'ten okunur;
  `if isVape` gibi koşul ya da başka mağazanın değerini fallback yapmak yasaktır.
- **Çoklu mağaza izolasyonu:** `/store/*` route'ları aktif tenant'a göre filtreler;
  sepet/checkout `tenantHeaders()` kullanır.
- **Migration:** idempotent + backfill'li; `slug='default'` varsayma (gerçek slug
  `aqua-havuz`), `coalesce(... , en-eski-tenant)` kullan.

---

## 5. Bağımsız denetim (Katman 1)

Kodu yazan AI, kendi kodunu "onaylayamaz" — kendini denetleyen ajan kör noktasını
paylaşır. Üretilen her batch, **yazardan bağımsız** bir denetçi tarafından (farklı
ajan/insan) diff üzerinde gözden geçirilir; bulgular önem sırasıyla raporlanır ve
deterministik geçit (Bölüm 1) yeşil olmadan birleştirilmez.

---

### Özet
Bu proje AI'ı dürüst *yapmaz* — **yalanı geçersiz kılar.** Tek geçer yol, bir programın
gerçekten yeşil dönmesidir. Kanıt yoksa, iş yoktur.
