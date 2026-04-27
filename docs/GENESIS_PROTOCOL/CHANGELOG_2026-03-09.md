# CHANGELOG: SYSTEM STABILITY & UI FIXES (2026-03-09)
> **Author:** Antigravity  
> **Topic:** Infrastructure, Admin UI, Storefront UX  

Bu güncelleme, projenin backend stabilitesini sağlamak, Admin panelindeki kritik hataları gidermek ve Storefront tarafındaki kullanıcı deneyimini iyileştirmek için yapılan çalışmaları içerir.

---

## 🛠️ Infrastructure & Backend Fixes

### 1. `ts-node` Bağımlılık Hatası Giderildi
- **Sorun:** Backend başlatılırken (`npx medusa dev`) `Cannot find module 'ts-node'` hatası alınıyordu.
- **Çözüm:** `package.json` içindeki bağımlılık çatışmaları `--legacy-peer-deps` kullanılarak çözüldü ve `ts-node` ortamı stabilize edildi.
- **Not:** Yeni geliştiriciler bağımlılık yüklerken mutlaka `npm install --legacy-peer-deps` kullanmalıdır.

### 2. Workflow İzlenebilirliği Doğrulandı
- **Durum:** Medusa Admin'deki "Workflows" (İş Akışları) sekmesinin boş görünmesinin normal olduğu (sadece çalışma geçmişini gösterdiği) teyit edildi.
- **Eklemeler:** İş akışı motorunu test etmek için `/admin/test-workflow` endpoint'i geçici olarak eklendi.

---

## 🎨 Admin UI Geliştirmeleri

### 1. Beyaz Sayfa (Frontend Crash) Hatası Giderildi
- **Sorun:** `src/admin/routes/system-health/page.tsx` rotasında kullanılan geçersiz ikonlar (`Heart`, `XCircle` vb.) Admin panelinin tamamen çökmesine neden oluyordu.
- **Çözüm:** Tüm ikonlar `@medusajs/icons` kütüphanesindeki geçerli karşılıklarıyla (`Sparkles`, `XMark`, `CheckCircleSolid`) değiştirildi.
- **Etki:** Admin paneli artık stabil şekilde yükleniyor.

---

## 🛒 Storefront (Vitrin) İyileştirmeleri

### 1. Sepete Ekleme Hata Bildirimleri (Toast)
- **Sorun:** Ürüne fiyat tanımlanmadığında sepete ekleme işlemi sessizce başarısız oluyordu.
- **Geliştirme:** `ProductActions` bileşenine hata yakalama mekanizması eklendi.
- **Sonuç:** Kullanıcı artık sepete ekleme başarısız olduğunda (örneğin fiyat eksikse) ekranın altında açıklayıcı bir **Toast mesajı** görüyor.

---

## 📖 Gelecek Geliştiriciler İçin Notlar
- **Fiyat Kontrolü:** Yeni eklenen ürünlerin sepete eklenebilmesi için Admin panelinden mutlaka en az bir **Price** (Fiyat) tanımlanması gerekmektedir.
- **Log Takibi:** Sistem sağlığı ve olay takibi için `src/api/admin/system-health/stats` endpoint'i üzerinden veriler çekilmektedir.
