# CHANGELOG - 2026-06-07

## 1. Mimari Güvenlik Güncellemesi: Internal Error Obfuscation (Hata Gizleme)
Sistemin API (`src/api`) katmanında yaşanan potansiyel bilgi sızıntılarını (Information Disclosure / Error Internal Leaks) önlemek amacıyla kapsamlı bir güvenlik güncellemesi yapılmıştır.

**Problem:** Sunucu tarafında (500 Internal Server Error) meydana gelen `error.message` ve `error.stack` detaylarının, Zod validasyon hataları haricinde istemciye (frontend / dış dünya) düz metin olarak sızması bir güvenlik açığı oluşturuyordu. Bu sayede sunucu yolları ve iç mimari dışarıdan görülebiliyordu.
**Çözüm:** 
- `src/api/admin/setup-b2b/route.ts`
- `src/api/admin/system-health/stats/route.ts`
- `src/api/admin/tenants/route.ts`
- `src/api/store/posts/[slug]/route.ts`
gibi tüm kritik rotalardaki `catch (error)` blokları standartlaştırıldı.
- Sadece `z.ZodError` olan validasyon hataları detaylı olarak dönerken, diğer tüm sunucu hatalarında istemciye "Sunucu hatası oluştu" şeklinde statik ve güvenli bir hata mesajı dönülmektedir.
- Orijinal hata detayı kaybolmasın diye `req.scope.resolve("logger")` ile sadece sunucu konsoluna basılması sağlandı.

---

## 2. Özellik: Mağazaya Özel (Tenant-Specific) Dinamik Vitrin Ayarları
Projenin "Multi-Tenant" (Çoklu Satıcı/Mağaza) doğasına uygun olarak, her mağazanın (veya markanın) kendi kurumsal linklerini, iletişim bilgilerini ve sosyal medya bağlantılarını bağımsız olarak yönetebileceği dinamik bir altyapı kurulmuştur. Eskiden kodun içine gömülü (hardcoded) olan `Footer.tsx` alanı CMS benzeri bir yapıya geçirilmiştir.

### 2.1 Backend / Veritabanı Mantığı
Medusa'nın ana DML (Data Modeling Language) yapısını bozmamak ve migration karmaşası yaratmamak için yeni bir tablo açılmamıştır. Zaten var olan `Tenant` tablosundaki `settings` alanı (`model.json().nullable()`) kullanılmıştır.
- **Veri Modeli Kırılımı:** `tenant.settings.storefront`
- **Okuma (Frontend):** `src/api/store/tenants/me/route.ts` üzerinden `storefront` verisi public olarak dışarı açılmıştır.
- **Yazma (Admin):** Zaten mevcut olan `POST /admin/tenants/:id` kullanılarak, Zod `UpdateTenantSchema`'sının esnekliğinden faydalanılmıştır.

### 2.2 Medusa Admin UI
- **Dosya:** `src/admin/routes/storefront-settings/page.tsx`
- Medusa v2'nin `@medusajs/ui` bileşenleri kullanılarak Admin paneline "Vitrin Ayarları" (Storefront Settings) sayfası eklendi.
- Bu sayfadan mağaza (tenant) seçimi yapılabilir; "İletişim", "Sosyal Medya", "Kurumsal / Müşteri / Yasal Linkler" form üzerinden doldurulup ilgili mağazanın `settings.storefront` alanına kaydedilir.

### 2.3 Next.js Storefront
- **Dosya:** `storefront/src/components/Footer.tsx`
- **İşleyiş:** Footer artık statik bir React bileşeni değil, bir **Server Component**'tir.
- Sayfa render edilirken `storefront/src/lib/server/tenant.ts` içerisindeki `retrieveCurrentTenant()` çağrılır ve backend'den anlık mağaza ayarları alınır.
- Eğer özel bir ayar yoksa eski `Aqua Havuz` bilgileri güvenli bir şekilde (fallback olarak) ekrana çizilir.
- "Her satıra bir link" (Örn: `Hakkımızda|/pages/hakkimizda`) şeklinde hazırlanan basit veri işleme parser'ı ile yönetim çok daha yalın hale getirilmiştir.

## Sonraki Geliştiricilere Not (Gelecek Vizyonu)
Sisteme eklenecek olan yeni mağazalar (örneğin elektronik, havuz veya elektronik sigara sektörü), kurulumdan sonra kendi vitrin kimliklerini anında değiştirebilirler. Bu yapı sadece Footer ile sınırlı kalmayıp; "Günün Fırsatı Banner'ı", "Kategori Sıralaması" veya "Mağazaya Özel Tema Renkleri" gibi alanların da Admin UI üzerinden `settings.storefront` içine yazılmasıyla rahatça genişletilebilir.
