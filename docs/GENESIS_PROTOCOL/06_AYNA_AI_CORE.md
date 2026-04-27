# GENESIS PROTOCOL: AYNA AI CORE & TECHNICAL MANUAL (06)
> **Author:** Antigravity / Mirror Core  
> **Last Updated:** 2026-03-15  
> **Status:** SUPREME - Production Ready

Bu doküman, PROJECT-AYNA-GENESIS mimarisindeki yapay zeka ekosisteminin (Ayna/Astra) çekirdek dokümantasyonudur. Sistemin mimari kararları, güvenlik protokolleri, otonom işleyişi ve "Bölünmüş Zihin" yaklaşımı burada tanımlanmıştır.

---

## 🏗️ 1. Mimari Vizyon: Bölünmüş Zihin (Split Mind)
Ayna, mağazanın operasyonel beynidir ancak güvenlik gereği iki farklı persona ve yetki modeli arasında izole edilmiştir.

### A. Storefront Zihni (Müşteri Yüzü)
- **Kanal:** `/api/store/ayna/chat`
- **Yetki:** SADECE OKUMA (Read-Only). Ürün önerir, teknik hesaplama yapar.
- **Güvenlik:** Asla fiyat güncelleyemez veya ürün ekleyemez. Kod seviyesinde kritik araçlardan (inventoryManagerTool vb.) arındırılmıştır.
- **İşleyici:** `AynaService.processMessage` (isAdmin: false)

### B. Admin Zihni (Yönetici Yüzü)
- **Kanal:** `/api/admin/ayna/chat`
- **Yetki:** Sınırsız Operasyonel Güç. Fiyat/stok güncelleme, kategori/ürün ekleme, blog üretimi.
- **Güvenlik:** Yalnızca Medusa Admin Auth katmanı üzerinden erişilebilir.
- **İşleyici:** `AynaService.processMessage` (isAdmin: true)

---

## 🧠 2. Otonom İşleyiş ve Peak 2.0 Özellikleri

### A. Mission-Centric Execution (Görev Zinciri)
AI, kritik kararları (stok değişimi, kampanya planlama) anında uygulamaz; bunun yerine `/admin/missions` sayfasında onay bekleyen bir **Mission** oluşturur. Bu "Human-in-the-loop" yaklaşımı, otonom hataları engeller.

### B. Smart AI Conscience (Akıllı Vicdan)
`ConscienceService`, Gemini AI kullanarak her işlemin etik uygunluğunu denetler. 
- **Denetim Noktaları:** Fiyat manipülasyonu, müşteri bütçe ihlali, yanıltıcı stok bilgisi.
- **Kayıt:** Tüm kararlar `MemoryConscience` tablosuna loglanır.

### C. B2B Personalization & Segment Zekası
Asistan, müşteri grubuna (`customerGroup`) duyarlıdır. B2B müşterilerine otomatik olarak toptan indirim kurguları ve özel vadeler planlamaya meyillidir.

---

## 🛠️ 3. Araç Çantası (AI Tools)

| Tool | Persona | İşlev |
|------|---------|-------|
| `search_products` | Her ikisi | Ürün arama ve tavsiye |
| `check_inventory` | Her ikisi | Anlık stok sorgulama |
| `calculatePoolChemicals` | Her ikisi | Teknik havuz hesaplamaları |
| `conscience_check` | Her ikisi | Etik denetim tetikleme |
| `manage_inventory` | Admin | Stok/Fiyat güncelleyerek Mission oluşturma |
| `create_campaign` | Admin | Kampanya planlayarak Mission oluşturma |
| `create_blog_post` | Admin | SEO içerik üretip Content Engine'e aktarma |

---

## 🔐 4. Güvenlik ve İzolasyon Protokolleri

1. **IP & Rate Limiting:** Storefront proxy üzerinden istek atarken `x-forwarded-for` başlığıyla gerçek IP'yi iletmeli. Mağaza genelinde değil, IP bazlı limit uygulanır.
2. **Session İzolasyonu:** Kayıtsız kullanıcılar için şifreli UUID kullanılır (`session_id`). Hafıza (Memory) bu kimlik üzerinden izole edilir.
3. **Tool Description Kutsallığı:** AI, araç seçimini kodun kendisinden değil, araç deklarasyonundaki `description` alanından yapar. Bu açıklamaları bozmak, asistanın o yeteneğe "kör" kalmasına neden olur.

---

## 📜 5. Teknik Arka Plan ve Tarihsel Notlar (Astra Legacy)

Projenin erken safhalarında (v1.0.0) AI ajanı **"Astra"** olarak adlandırılmış ve hibrit arama (Meilisearch + Pinecone) için **RRF (Reciprocal Rank Fusion)** algoritması tasarlanmıştır. 
- **RRF Formülü:** `score = Σ (1 / (k + rank_i))`
- **Evrim:** Güncel Genesis yapısında vektör araması `pgvector` ve `Medusa v2 Query` katmanına taşınmış, dokümantasyon "Ayna" isimlendirmesiyle modernize edilmiştir.

---

## 🧪 6. Doğrulama (Verification)
Sistemin çalıştığını doğrulamak için `test-agent.js` betiği kullanılabilir:
```bash
docker exec medusa_server_core node /server/src/test-agent.js
```

---
*Bu rehber Genesis Protokolü'nün bir parçasıdır. İzinsiz değiştirilemez.*
