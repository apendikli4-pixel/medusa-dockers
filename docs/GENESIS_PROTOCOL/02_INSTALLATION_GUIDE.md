# GENESIS PROTOCOL: INSTALLATION GUIDE (02)
> **Author:** Antigravity / Mirror Core  
> **Last Updated:** 2026-03-09  
> **Status:** STABLE - Production Ready  

Bu doküman, PROJECT-AYNA-GENESIS projesini yerel geliştirme ortamında kurulum adımlarını açıklar.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- **Docker Desktop** (Zorunlu)
- **Node.js v20+** (IDE desteği için önerilir)
- **VS Code** (Önerilen IDE)

---

## 📦 Adım 1: Docker ile Projeyi Başlatma

```bash
# Proje dizinine gidin
cd PROJECT-AYNA-GENESIS

# Docker container'ları başlatın
docker-compose up -d

# Backend durumunu kontrol edin
docker logs -f medusa_server_core
```

**Beklenen sonuç:** `Server is ready on port 9000`

---

## 🛠️ Adım 2: IDE Desteği için Yerel Kurulum (ÖNERİLİR)

> ⚠️ **Bu adım opsiyoneldir** ama IntelliSense, autocomplete ve hata gösterimi için **şiddetle tavsiye edilir**.

Docker container'ları kendi `node_modules`'ünü kullanır. Ancak VS Code gibi IDE'lerin tip kontrolü yapabilmesi için **yerel node_modules** gereklidir.

### Node.js Kurulumu
1. [nodejs.org](https://nodejs.org) adresinden **LTS sürümünü** indirin
2. Kurulumu tamamlayın
3. **VS Code'u yeniden başlatın** (PATH değişkenlerinin yüklenmesi için)

### Bağımlılıkları Yükleme

```bash
# Backend bağımlılıkları
cd PROJECT-AYNA-GENESIS
npm install --legacy-peer-deps

# Storefront bağımlılıkları
cd storefront
npm install --legacy-peer-deps
```

### Neden `--legacy-peer-deps`?
Medusa v2 bazı paketlerde peer dependency uyumsuzlukları içerir. Bu flag, uyumsuzlukları atlayarak kurulumu tamamlar.

---

## ✅ Doğrulama

Kurulum tamamlandığında:
- VS Code'daki **kırmızı dosya ikonları kaybolmalı**
- **IntelliSense/Autocomplete** çalışmalı
- **Go to Definition (F12)** çalışmalı

---

## 🔧 Sorun Giderme

### "npm: command not found"
→ Node.js kurulumu sonrası **VS Code'u yeniden başlatın**

### Kırmızı hatalar hala görünüyor
→ **VS Code'u tamamen kapatıp yeniden açın** (TypeScript sunucusu yenilenir)

### Docker container çalışmıyor
```bash
docker-compose down
docker-compose up -d --build
```

### Backend "ts-node" bulunamadı hatası
Eğer `npx medusa dev` çalışırken `Cannot find module 'ts-node'` hatası alırsanız, bağımlılıkları temizleyip tekrar kurun:
```bash
rm -rf node_modules
npm install --legacy-peer-deps
```

### Admin Paneli Beyaz Sayfa
Eğer Admin paneli beyaz sayfa olarak kalıyorsa:
1. İptal (`Ctrl+C`) edip tekrar başlatın.
2. `src/admin` altındaki rotalarda geçersiz ikon (`@medusajs/icons`'da olmayan) kullanılıp kullanılmadığını kontrol edin.

---

## 📁 Proje Yapısı

```
PROJECT-AYNA-GENESIS/
├── src/                    # Backend kaynak kodu
│   ├── api/               # API route'ları
│   ├── modules/           # Medusa modülleri (ayna, content_engine)
│   └── workflows/         # Medusa workflow'ları
├── storefront/            # Next.js frontend
├── docs/                  # Dokümantasyon
├── docker-compose.yml     # Docker konfigürasyonu
└── .env                   # Environment değişkenleri
```

---

## 🔑 Önemli Environment Değişkenleri

```env
# Veritabanı
DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa-genesis

# Gemini AI (TEK MERKEZ)
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_NAME=gemini-1.5-flash

# Admin
MEDUSA_ADMIN_ONBOARDING_TYPE=nextjs
```

> ⚠️ **Model değiştirmek için SADECE .env'deki GEMINI_MODEL_NAME'i düzenleyin.** Kodlara dokunmayın!
