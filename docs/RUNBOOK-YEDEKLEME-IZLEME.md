# Runbook — Yedekleme & İzleme (Üretim Güvenlik Ağı)

> Bir "hobi"yi "işletme"den ayıran iki şey: **veri kaybetmemek** ve **çöktüğünde haberdar olmak.**
> Bu belge ikisini de kapsar. **Altın kural: test edilmemiş yedek = yedek değildir.**

---

## 1. Dead Man's Switch — Çöktüğünde Haber Al

Kalp atışı job'ı (`src/jobs/integrity-heartbeat.ts`) her çalıştığında dış bir izleyiciye **ping** atar.
Ping beklenen aralıkta GELMEZSE (sunucu düşerse, fatura kapanırsa, job ölürse) izleyici **sana e-posta/SMS** atar.
Neden dış? Çünkü in-app izleme, sunucu düştüğünde kendisi de ölür.

### Kurulum (5 dakika, ücretsiz)
1. [healthchecks.io](https://healthchecks.io) (veya Cronitor / Better Uptime) hesabı aç.
2. Yeni bir "Check" oluştur; period = 1 saat (kalp atışı saatlik), grace = 20 dk.
3. Sana verilen ping URL'ini sunucu ortamına ekle: `HEARTBEAT_PING_URL=https://hc-ping.com/<uuid>`
4. Deploy et. Artık her saat ping gelir; bütünlük FAIL olursa `<url>/fail` (anında alarm); ping kesilirse (sunucu down) alarm.

> Ek katman: Ayrıca `https://api.<domain>/health` adresini bir **uptime monitörüne** (UptimeRobot ücretsiz) ekle — bağımsız ikinci göz.

---

## 2. Otomatik Veritabanı Yedeği

`src/jobs/db-backup.ts` her gün **03:00**'te `pg_dump` ile gzip'li, zaman damgalı yedek alır,
eski yedekleri (retention) siler, opsiyonel off-site yükleme yapar.

### Ortam değişkenleri
```
BACKUP_DIR=/server/backups          # yedek dizini (kalıcı VOLUME olmalı!)
BACKUP_RETENTION_DAYS=14            # bundan eski yerel yedekler silinir
BACKUP_UPLOAD_CMD=...               # off-site yükleme (AŞAĞIDA — ZORUNLU)
```

### ⚠️ Off-site ZORUNLUDUR
Sunucu-içi yedek, sunucu/volume ölürse onunla ölür (bugünkü fatura olayını hatırla). Gerçek güvenlik
için yedek BAŞKA bir yere kopyalanmalı. `BACKUP_UPLOAD_CMD` çalıştırılır; dosya yolu `$BACKUP_FILE` env'indedir:
```bash
# Örnek (rclone ile S3/Backblaze B2/Google Drive):
BACKUP_UPLOAD_CMD='rclone copy "$BACKUP_FILE" b2:genesis-backups'
# Örnek (aws s3):
BACKUP_UPLOAD_CMD='aws s3 cp "$BACKUP_FILE" s3://genesis-backups/'
```
`BACKUP_UPLOAD_CMD` yoksa job uyarır ("yedek yalnızca sunucuda").

> Kalıcı volume notu: `BACKUP_DIR` Coolify/Docker'da bir **named volume**'a maplenmeli, yoksa
> container yeniden kurulunca yerel yedekler de gider.

---

## 3. Geri Yükleme (Restore) — ve TEST etme disiplini

**En kritik kısım budur.** Yedek alıyor olman bir şey ifade etmez; *geri yükleyebildiğini kanıtlamadıkça.*

### Geri yükleme prosedürü
```bash
# 1) Yedeği indir (off-site'tan) — örn:  rclone copy b2:genesis-backups/genesis-XXXX.sql.gz .
# 2) (Tercihen) BOŞ/yeni bir DB'ye yükle, üretimi ezme:
gunzip -c genesis-2026-06-14T03-00-00-000Z.sql.gz | psql "postgresql://user:pass@host:5432/genesis_restore_test"
# 3) Restore edilen DB'de satır sayıları / kritik tablolar kontrol edilir.
```

### Aylık test (takvime koy)
1. En güncel off-site yedeği indir.
2. Geçici bir DB'ye geri yükle.
3. `tenant`, `order`, `product`, `memory_truth` tablolarında satır var mı doğrula.
4. Sorun varsa → yedekleme/restore zinciri bozuk demektir; ŞİMDİ düzelt (kriz anında değil).

> Üretim DB'sine geri yükleme YIKICIDIR (mevcut veriyi ezer) — yalnızca gerçek bir felakette,
> ve önce mevcut durumun bir yedeğini alarak yapılır.

---

## 4. Hızlı Kontrol Listesi
- [ ] `HEARTBEAT_PING_URL` ayarlı, izleyici check'i yeşil.
- [ ] `BACKUP_DIR` kalıcı volume'a maplenmiş.
- [ ] `BACKUP_UPLOAD_CMD` ayarlı, off-site'ta dosyalar görünüyor.
- [ ] Bu ay bir kez restore TEST edildi.
- [ ] `https://api.<domain>/health` ayrı bir uptime monitöründe.

İlgili: kalp atışı + bütünlük → `docs/CANLI-BUTUNLUK-DENETCISI.md`.
