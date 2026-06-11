# AYNA GENESIS — İşletme Kılavuzu (Operasyon Runbook)

Bu belge, sistemi **yazılım bilmeden** yönetebilmen için hazırlandı. Güncel: 2026-06.

---

## 1. Mağazalar ve adresler
| Mağaza | Adres | Sektör |
|---|---|---|
| Aqua Havuz | https://ayna.141.98.48.155.sslip.io | Havuz |
| Vozol | https://vozol.141.98.48.155.sslip.io | Vape (18+) |
| Yönetim (Admin) | https://api.141.98.48.155.sslip.io/app | — |
| API/Backend | https://api.141.98.48.155.sslip.io | — |

- **Tek sunucu, iki mağaza.** Ürünler tamamen izole: bir mağazanın ürünü/kategorisi diğerinde görünmez.
- Ayrım **Satış Kanalı (Sales Channel)** ile yapılır: "Default Sales Channel" = Aqua Havuz, "Vozol Vape" = Vozol.

## 2. Ürün yönetimi (en önemli kural)
- Admin → sol menü **"Mağazalarım"**: her mağazanın ürün sayısı + tek tıkla o mağazanın ürünlerine git.
- **YENİ ÜRÜN EKLERKEN:** ürünün **"Satış Kanalları"** bölümünden doğru mağazayı seç.
  - Vape ürünü → **Vozol Vape**
  - Havuz ürünü → **Default Sales Channel**
- ⚠️ Yanlış kanal = ürün yanlış mağazada çıkar. İzolasyonun tek dayanağı budur.
- Fiyat/stok: ürün sayfasından girilir. (Vozol ürünleri şu an placeholder — gerçek fiyatları gir.)

## 3. Vitrin Ayarları (footer / iletişim / sosyal / hero görseli)
- Admin → **"Vitrin Ayarları"** → üstte **"Düzenlenecek Mağaza"** seç (Aqua Havuz / Vozol).
- Buradan: iletişim bilgisi, sosyal medya linkleri, footer linkleri, **anasayfa hero görseli (yükle veya URL)**.

## 4. Blog & Sayfalar (CMS)
- Admin → **"Sayfalar"**: Hakkımızda, İletişim, Gizlilik gibi sayfaları oluştur/düzenle.
- Admin → **Blog**: yazı ekle/düzenle. İçerik alanının üstündeki **"🖼️ İçeriğe Görsel Ekle"** ile görsel ekleyebilirsin.
- NOT: Blog/Sayfalar şu an **iki mağazada ortak** (mağazaya özel değil). Ayrılması gerekirse geliştirici işi.

## 5. Yapay Zekâ (Ayna)
- Model: **qwen3.6:35b-a3b** (açık kaynak, sunucuda çalışır, veri dışarı çıkmaz).
- **Dürüstlük katmanı:** müşteri fiyat/stok sorunca AI **her zaman veritabanına bakar**, uydurmaz (olana "var", olmayana "yok").
- Sıcak yanıt ~10-20 sn (CPU sunucu). İlk soru bir kez ~70 sn (model belleğe yüklenir), sonra hızlanır.
- Hız/kalite ayarı: `OLLAMA_CHAT_THINK` env (varsayılan kapalı=hızlı). Anlık cevap istenirse ileride GPU.

## 6. Deploy (kod güncelleme) — geliştirici için
- Kod `github.com/apendikli4-pixel/medusa-dockers` (branch `main`) reposunda.
- Her `git push`'ta **CI** otomatik kontrol eder (backend tip + storefront build). Kırmızıysa deploy etme.
- Deploy Coolify'dan: panel veya API ile "Redeploy".
- ✅ **Deploy sonrası 504 sorunu kalıcı çözüldü** (gereksiz ağ kaldırıldı). Yine de nadiren site açılmazsa tek komut:
  ```
  docker restart coolify-proxy
  ```

## 7. Yedekler
- **Veritabanı:** `db-backup` servisi her gün otomatik yedek alır, son **7** yedeği tutar (`db_backups` volume).
- Felaket anında bu yedeklerden geri dönülür. (İleride dışarı/offsite kopya önerilir.)

## 8. 🔴 Güvenlik — SENİN yapman gerekenler
- **GitHub token'ı yenile:** Git remote'unda eski PAT açıkta paylaşıldı. GitHub → Settings → Developer settings → Personal access tokens → eskisini **iptal et**, yeni üret. (Geliştiriciye yeni token'ı ver, remote güncellensin.)
- **Coolify API token'ı yenile** (oturumlarda paylaşıldı): Coolify → Keys & Tokens.
- **Admin parolası** güçlü olsun, kimseyle paylaşma.

## 9. Bakım
- Sunucuda "System restart required" (kernel güncellemesi) görünürse: trafiğin düşük olduğu bir saatte VPS'i bir kez **yeniden başlat** (kısa kesinti).

## 10. Sıradaki geliştirmeler (öncelik sırası — geliştirici işi)
1. **Staging/test ortamı** — değişiklikler canlıdan önce denensin.
2. **Blog/Sayfa mağazaya özel** izolasyonu.
3. **Vozol'a ayrı yönetici** (devredilirse; RBAC altyapısı hazır).
4. Meilisearch'i devreye alma (hızlı + yazım-toleranslı arama).
5. Ödeme (PayTR) + e-posta (Brevo) uçtan uca test.
6. Trafik artarsa: AI eşzamanlılık / GPU.

---
*Bu kılavuz değiştikçe güncellenmelidir.*
