# Ayna Genesis - SEO ve Performans Geliştirme Kuralları (GENESIS_PROTOCOL_EXTENSION)

Bu doküman, Ayna Genesis projesinin (Medusa v2 Backend + Next.js 15 Storefront) "Müşteri ve Arama Motoru Hızı" (Core Web Vitals & SEO) hedeflerine uygun olarak nasıl geliştirilmesi gerektiğini tanımlar. Bu kurallar `AGENTS.md` ve genel `GENESIS_PROTOCOL` kurallarını tamamlayıcı niteliktedir. Gelecek geliştiriciler (insan veya otonom AI ajanları) bu kurallara harfiyen uymak zorundadır.

## 1. Storefront (Next.js) Görsel Kuralları
Google Pagespeed (LCP - Largest Contentful Paint) puanını korumak için, **hiçbir React komponentinde yerel HTML `<img>` etiketi kullanılamaz.**

* **Zorunlu Kullanım:** Her zaman `next/image` modülünden `Image` komponenti kullanılacaktır.
* **Layout ve Sizes:** Responsive tasarımlarda `layout="fill"` veya `fill` prop'u, mutlaka `sizes` attribute'u ile birlikte kullanılacaktır. Örneğin: `sizes="(max-width: 768px) 100vw, 50vw"`.
* **Priority (Öncelik):** Viewport içinde (above-the-fold) hemen görünen ürün resimleri veya Hero görselleri (örn: `page.tsx`'teki ana görsel) mutlaka `priority={true}` veya `priority` etiketiyle işaretlenmelidir.
* **External Domains:** Cloudinary, AWS S3 veya Medusa public domain'lerinden gelen resimlerin URL pattern'leri mutlaka `storefront/next.config.js` dosyasında tanımlı olmalıdır.

## 2. Storefront Font ve Tipografi Kuralları
Fontların asenkron yüklenmesinden kaynaklanan ekran kaymalarını (CLS - Cumulative Layout Shift) önlemek hayati önem taşır.

* **Yasak:** `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` gibi dış kaynaklı CSS/Font çağrıları `layout.tsx` veya herhangi bir sayfada kesinlikle kullanılamaz.
* **Zorunlu Kullanım:** Tüm fontlar `next/font/google` modülünden yüklenmelidir.
* **Değişken Entegrasyonu:** Yüklenen fontlar CSS Variable (Değişken) olarak dışa aktarılmalı (`variable: '--font-x'`) ve `layout.tsx`'te `<html className={...}>` üzerine işlenmelidir. Sektörel tema sistemi (`themes.ts`) bu değişkenleri okuyarak stilleri basar.

## 3. Kod Bölme (Code Splitting) ve Yükleme Stratejisi
* **Server Components (RSC):** Next.js 15'in varsayılanı olan Server Component'ler önceliklidir. Etkileşim (onClick, useState) gerektirmeyen tüm componentler Server Component olarak kalmalıdır.
* **Client Components (`"use client"`):** Sadece gerçekten kullanıcı etkileşimi gereken yerlerde ve dosyanın en üstünde deklare edilerek kullanılmalıdır. Ayna AI `ChatWidget` buna bir örnektir.
* **Dinamik Yükleme (Dynamic Imports):** Ağır kütüphaneler (örn. Three.js, karmaşık grafikler) sayfada anında gerekmiyorsa `next/dynamic` ile asenkron yüklenmelidir.

## 4. Backend (Medusa v2) Caching Stratejisi
Backend, halihazırda Redis tabanlı in-memory cache sistemi kullanmaktadır. 
* Yeni oluşturulan özel endpoint'ler (`src/api/*`), eğer sık çağrılan okuma (GET) işlemleri içeriyorsa, Medusa Cache servisini (`req.scope.resolve("cacheService")`) kullanmalıdır.
* AI (Gemini) API çağrısı yapan tüm endpoint'ler (örn: `/store/ayna/chat`), `src/lib/rate-limiter.ts` kullanılarak mutlaka Rate Limit korumasına alınmalıdır (Zaten `AGENTS.md` kuralıdır).

Bu dokümanda yer alan kurallar CI/CD pipeline'larında ve IDE Linting seviyesinde desteklenecektir. Lütfen her Pull Request öncesinde kontrol ediniz.
