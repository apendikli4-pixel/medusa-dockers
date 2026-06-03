# AI İçerik Üretimi — Durum ve Kullanım

Son güncelleme: 2026-06-04 (otonom çalışma)

## Özet

Blog AI içerik üretim **altyapısı tam çalışıyor ve doğru kurulu**. Tek kısıt
donanım/kota kaynaklı **içerik kalitesi** — kod veya mimari sorunu değil.

## Mimari (sağlam, üretime hazır)

```
POST /admin/blog/generate { title, keywords }
   │
   ├─ 1. Hemen "generating" taslağı oluştur, 202 dön (1 sn)   ← UX: kullanıcı beklemez
   │
   └─ 2. Arka planda (fire-and-forget):
         ayna.generateBlogContent(prompt)
            → HybridAIProvider.generateText()
                 ├─ Gemini dene (gemini-2.0-flash)
                 └─ başarısızsa → Ollama fallback (host.docker.internal:11434)
            → bitince blog_post.content doldur, status="draft"
            → hata olursa taslağa not yaz (DÜRÜSTLÜK: sessiz kalmaz)
```

Doğrulanan davranışlar (E2E test edildi):
- ✅ Endpoint 1 sn'de 202 döner (async — timeout/asılma yok)
- ✅ Taslak `status="generating"` oluşur, arka planda dolar
- ✅ İçerik üretilince `status="draft"` olur (editör onayı sonrası publish)
- ✅ Üretim başarısızsa taslağa hata notu yazılır
- ✅ AbortController timeout (`OLLAMA_TIMEOUT_MS`, varsayılan 240sn) sonsuz beklemeyi önler
- ✅ `/store/blog` + `/store/blog/[slug]` yayınlanmış yazıları sunar

## Kısıt: İçerik Kalitesi (donanım/kota)

| Sağlayıcı | Durum | Sebep |
|---|---|---|
| **Gemini** (gemini-2.0-flash) | ❌ Kota 0 | Ücretsiz tier tükenmiş (`limit: 0`). Kalite YÜKSEK olurdu. |
| **Ollama llama3.2** (3B) | ⚠️ Çalışıyor ama zayıf | Bu makinede GPU yok → CPU inference. 3B model Türkçe morfolojisinde yetersiz ("berraknessi", "suyuyun" gibi bozuk kelimeler, tekrar). 150 kelime ~140 sn. |

**Sonuç:** Bu donanımda yayınlanabilir kalitede Türkçe AI içeriği üretilemez.
Altyapı hazır; sadece daha iyi bir model/kota bekliyor.

## Üretime alırken yapılacaklar (öncelik sırasına göre)

1. **En kolay:** Geçerli kotalı bir `GEMINI_API_KEY` gir (`.env`).
   Gemini birincil sağlayıcı; kota gelince kaliteli içerik anında üretilir.
   Kod değişikliği GEREKMEZ.
2. **Alternatif (yerel):** GPU'lu sunucuda `qwen2.5:7b` veya daha büyük model:
   ```
   ollama pull qwen2.5:7b
   # .env: OLLAMA_MODEL_NAME=qwen2.5:7b
   docker compose up -d --force-recreate medusa-server
   ```
   qwen2.5 Türkçe'de llama3.2'den çok daha iyi.
3. **Bulut LLM:** OpenAI/Anthropic provider eklenebilir (hybrid-ai.provider.ts
   genişletilebilir — Gemini+Ollama deseni hazır şablon).

## İlgili dosyalar
- `src/api/admin/blog/generate/route.ts` — async üretim endpoint'i
- `src/modules/ayna/service.ts` — `generateBlogContent()` metodu
- `src/modules/ayna/services/hybrid-ai.provider.ts` — Gemini+Ollama, AbortController timeout
- `.env` — `GEMINI_API_KEY`, `OLLAMA_API_URL`, `OLLAMA_MODEL_NAME`, `OLLAMA_TIMEOUT_MS`

## Manuel blog (AI olmadan — her zaman çalışır)
```
POST /admin/blog
{ "title": "...", "slug": "...", "content": "markdown...", "status": "published" }
```
Admin elle de blog yazısı oluşturabilir; AI opsiyoneldir.
```
admin: admin@aquahavuz.com / AynaAdmin2026!
```
