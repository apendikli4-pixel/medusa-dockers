# Admin IP Kısıtlama + Güvenlik İzleme — Tasarım Dokümanı

- **Tarih:** 2026-06-15
- **Proje:** Ayna Genesis (Medusa v2 backend)
- **Durum:** Onaylandı (kullanıcı) → uygulama planına hazır
- **Kapsam:** Yalnızca yönetim (admin) düzlemi. Mağaza (storefront / `/store/*`) etkilenmez.

## 1. Amaç ve Bağlam

Kullanıcı, yönetim arayüzünü (admin panel + admin API'leri) yalnızca **önceden tanımlanmış
IP adreslerinden** erişilebilir kılmak ve güvenlik olaylarını **izlemek** istiyor.

Mevcut durum tespiti (2026-06-15 inceleme):
- Sunucu yerel bir Windows 11 makinesinde Docker ile çalışıyor; yalnızca **özel IP'ler**
  (`10.180.71.29` Wi-Fi, NAT arkası), genel IP yok. Şu an aktif saldırı/veri-sızma izi **yok**.
- Loglarda injection bloğu, rate-limit aşımı veya tarayıcı/bot yolları **görülmedi**;
  401'ler admin panelinin kendi giriş-öncesi istekleridir (normal).
- Veritabanı (5433), Redis (6380), Meilisearch (7700) `0.0.0.0`'a bağlı — bu tasarımın
  doğrudan konusu değil ama ileride internete açılırsa sertleştirilmeli (bkz. §9).

Mevcut altyapı (yeniden kullanılacak):
- `src/config/rate-limits.ts` → `ADMIN_WHITELIST_IPS` (env'den, virgülle ayrılmış IP/CIDR).
- `src/lib/rate-limiter.ts` → `isIpWhitelisted()` + `ipToNumber()` (CIDR IPv4 eşleştirme) —
  şu an yalnızca rate-limit'i **atlatmak** için kullanılıyor.
- `src/api/middlewares.ts` → `defineMiddlewares` ile `/admin/*` ve `/store/*` zincirleri.
- `src/utils/get-client-ip.ts` → header tabanlı IP çıkarma.

## 2. Kararlar (kullanıcı onaylı)

1. **Kapsam:** Yalnızca `/admin/*`. Mağaza herkese açık kalır.
2. **IP yönetimi:** Env listesi (`ADMIN_WHITELIST_IPS`) + **localhost daima izinli**.
   Değişiklik = `.env` düzenle + konteyneri yeniden başlat. (DB-yönetimli panel sonraki faz.)
3. **İzleme:** Yapılandırılmış güvenlik-olay loglama + admin'den son olayları görüntüleme.
   Harici uyarı (e-posta/Sentry) **yok** (sonraki faz).

## 3. Mimari

`/admin/*` zincirinin **en başına** bir bekçi middleware eklenir. İstek; rate-limit, tenant
ve auth katmanlarına varmadan önce IP kontrolünden geçer.

```
/admin/* isteği
  └─► [adminIpAllowlist]            ← YENİ, zincirde ilk
        ├─ mod=off                  → her zaman devam (kapalı)
        ├─ mod=observe              → IP'yi 'ADMIN_IP_OBSERVED' olarak logla, DEVAM (engelleme yok)
        ├─ mod=enforce + izinli/localhost → DEVAM
        └─ mod=enforce + izinsiz    → 403 + 'ADMIN_IP_BLOCKED' olayı (DUR)
  └─► [globalRateLimiter] → [tenantContext] → [tenantAls] → [tenantDbGuard] → auth → handler
```

## 4. Bileşenler

### 4.1 Paylaşılan IP mantığı — `src/lib/ip-allowlist.ts` (yeni)
- `getRequestIp(req): string` — `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip`
  → `req.socket.remoteAddress` sırası. IPv4-mapped IPv6 (`::ffff:127.0.0.1`) normalize edilir.
- `isLoopback(ip): boolean` — `127.0.0.1`, `::1`, `::ffff:127.0.0.1`.
- `isIpAllowed(ip, list): boolean` — tam eşleşme + IPv4 CIDR + IPv6 tam eşleşme.
- **Refactor:** `rate-limiter.ts` içindeki `isIpWhitelisted`/`ipToNumber` buraya taşınır;
  rate-limiter bu paylaşılan util'i kullanır (tek kaynak, kopya mantık kalkar).

### 4.2 Bekçi middleware — `src/api/middlewares/admin-ip-allowlist.ts` (yeni)
- `ADMIN_IP_RESTRICTION_MODE` okur (`off` | `observe` | `enforce`, varsayılan `off`).
- IP'yi `getRequestIp` ile alır. `off` → `next()`. `observe` → olay logla + `next()`.
- `enforce` → `isLoopback || isIpAllowed(ip, ADMIN_WHITELIST_IPS)` ise `next()`,
  değilse `recordSecurityEvent("ADMIN_IP_BLOCKED", ...)` + `res.status(403).json({ error })`.
- **Fail-closed:** `enforce` modunda IP belirlenemez ve loopback değilse → engelle.
- Yanıt gövdesinde stack/iç-yol/sınıf adı **sızmaz** (proje kuralı).

### 4.3 Güvenlik olay kaydı — `src/lib/security/security-events.ts` (yeni)
- `recordSecurityEvent(type, details)`:
  - `logger.warn("[SECURITY] ...")` ile yapılandırılmış log.
  - Son `N=500` olayı modül-düzeyi **halka tampon**da (in-memory) tutar.
- `getRecentSecurityEvents({ limit, type? })` → tampondan okur.
- Olay şekli: `{ timestamp, type, ip, path, method, actor?, details? }`.
- Tip seti (v1): `ADMIN_IP_BLOCKED`, `ADMIN_IP_OBSERVED`, `INJECTION_BLOCKED`,
  `RATE_LIMIT_EXCEEDED`.

### 4.4 Admin görüntüleme ucu — `src/api/admin/security/events/route.ts` (yeni)
- `GET /admin/security/events` — zod ile `limit` (1–500, vars. 100) ve opsiyonel `type`
  doğrulanır. Admin-auth + (enforce'ta) IP-korumalı. `getRecentSecurityEvents()` döndürür.
- HTTP method semantiği: salt-okunur → `GET`.

### 4.5 Bağlama — `src/api/middlewares.ts` (düzenle)
- `/admin/*` zincirinde `adminIpAllowlist` **ilk** middleware olarak eklenir
  (globalRateLimiter'dan önce).

### 4.6 Olay yayma — mevcut kodda küçük düzenleme
- `chat-service.ts`: injection bloğu yakalandığında `recordSecurityEvent("INJECTION_BLOCKED")`.
- `rate-limiter.ts`: limit aşıldığında `recordSecurityEvent("RATE_LIMIT_EXCEEDED")`.

## 5. Konfigürasyon (.env)

| Değişken | Değer | Not |
|---|---|---|
| `ADMIN_IP_RESTRICTION_MODE` | `off` \| `observe` \| `enforce` | Varsayılan `off` — kimseyi kilitlemez |
| `ADMIN_WHITELIST_IPS` | `1.2.3.4,10.0.0.0/24` | **Mevcut** değişken; yeniden kullanılır |

- `localhost` (`127.0.0.1`, `::1`) **koda gömülü** olarak daima izinli (acil çıkış).
- `enforce` + boş liste → yalnızca localhost geçer (uzaktan herkes bloke; yine güvenli).

## 6. ⚠️ Güvenli Devreye Alma (kilitlenmeyi önler)

Sunucu Docker içinde olduğundan konteyner, tarayıcının gerçek IP'sini `127.0.0.1` yerine
**Docker ağ geçidi IP'si** olarak görebilir. Bu yüzden doğrudan `enforce` açmak kullanıcıyı
kilitleyebilir. Geçiş 3 adımlıdır:

1. `mode=observe` → admine birkaç kez gir; her istek `ADMIN_IP_OBSERVED` olarak loglanır.
2. `GET /admin/security/events`'ten konteynerin **gördüğü gerçek IP**'yi oku; bunu
   `ADMIN_WHITELIST_IPS`'e ekle.
3. `mode=enforce`'a geç ve yeniden test et. Artık yalnızca izinli IP + localhost girer.

## 7. Hata Yönetimi

- Middleware kendi içinde hata atarsa: `enforce`'ta fail-closed (engelle), `off/observe`'ta
  `next()` (mağaza/işlevsellik bozulmaz). Tüm hatalar server-side loglanır.
- Olay tamponu dolduğunda en eski kayıt düşer (sabit bellek, sızıntı yok).

## 8. Test (jest, mevcut `*.spec.ts` düzeni)

- `ip-allowlist.spec.ts`: tam eşleşme, IPv4 CIDR (içeride/dışarıda), loopback, IPv6,
  geçersiz IP, boş liste.
- `admin-ip-allowlist.spec.ts` (middleware, mock req/res): `off`→geç, `observe`→olay+geç,
  `enforce`+izinli→geç, `enforce`+izinsiz→403+olay, IP yok+enforce→403 (fail-closed).
- `security-events.spec.ts`: kayıt/okuma, halka tampon kapasite taşması, tip filtresi.

## 9. Bilinçli Sınırlar / Sonraki Fazlar (YAGNI)

- İzin listesi env'de; DB-yönetimli admin sayfası **sonraki faz**.
- Olay tamponu bellekte; yeniden başlatınca sıfırlanır. Kalıcı DB tablosu **sonraki faz**.
- Framework-düzeyi 401 auth-hataları olay yayımı **sonraki faz** (response interceptor gerekir).
- Bu **uygulama katmanı** korumasıdır. İnternete açık dağıtımda asıl kilit için
  **reverse proxy / firewall** katmanı (ayrıca DB/Redis/Meili'yi `127.0.0.1`'e bağlama)
  önerilir — o ayrı bir sertleştirme çalışmasıdır.

## 10. Etkilenen Dosyalar (özet)

**Yeni:** `src/lib/ip-allowlist.ts`, `src/api/middlewares/admin-ip-allowlist.ts`,
`src/lib/security/security-events.ts`, `src/api/admin/security/events/route.ts`,
+ 3 test dosyası.
**Düzenlenen:** `src/api/middlewares.ts`, `src/lib/rate-limiter.ts`,
`src/modules/ayna/services/chat-service.ts`, `.env.template` (varsa).
