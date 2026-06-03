import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { BLOG_MODULE } from "../../../../modules/blog"
import type BlogModuleService from "../../../../modules/blog/service"

/**
 * POST /admin/blog/generate
 * Başlıktan AI ile SEO uyumlu blog içeriği üretir.
 *
 * ── ASENKRON MİMARİ ──
 * AI üretimi (özellikle Ollama CPU inference) dakikalar sürebilir; HTTP
 * isteğini bu kadar bekletmek timeout/UX sorunu yaratır. Bu yüzden:
 *   1. Hemen bir taslak (status="generating") oluşturulur ve 202 ile döner.
 *   2. AI üretimi arka planda (fire-and-forget) çalışır.
 *   3. Bitince blog_post.content doldurulur, status="draft" olur.
 *   4. Hata olursa status="draft" + content'e hata notu yazılır (sessiz kalmaz).
 *
 * İstemci GET /admin/blog ile durumu poll edebilir (status alanı).
 *
 * Body: { title: string, keywords?: string[] }
 * Yanıt: 202 { post }  (post.status === "generating")
 */

const GenerateSchema = z.object({
    title: z.string().min(3, "Başlık en az 3 karakter olmalı"),
    keywords: z.array(z.string()).optional().default([]),
})

/** Türkçe karakterleri ASCII'ye çevirip URL-güvenli slug üretir. */
function slugify(input: string): string {
    const map: Record<string, string> = {
        ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
        Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u",
    }
    return input
        .split("")
        .map((ch) => map[ch] ?? ch)
        .join("")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { title, keywords } = GenerateSchema.parse(req.body)
    const logger = req.scope.resolve("logger") as any
    const blogService = req.scope.resolve(BLOG_MODULE) as BlogModuleService

    // Benzersiz slug
    let slug = slugify(title)
    const existing = await blogService.listBlogPosts({ slug })
    if (existing?.length) slug = `${slug}-${Date.now().toString().slice(-5)}`

    // 1. Hemen "generating" taslağı oluştur
    const [post] = await blogService.createBlogPosts([
        {
            title,
            slug,
            content: "_AI içerik üretiliyor… Bu sayfa birkaç dakika içinde otomatik dolacaktır._",
            excerpt: title,
            seo_title: title,
            seo_description: title,
            keywords: keywords.length ? keywords : null,
            status: "generating",
            ai_generated: true,
        } as any,
    ])

    // 2. Arka planda AI üretimi (fire-and-forget — isteği bloklamaz)
    const postId = post.id
    ;(async () => {
        try {
            const ayna = req.scope.resolve("ayna") as any
            const prompt =
                `Görev: Aşağıdaki başlık için kısa ve profesyonel bir Türkçe blog yazısı yaz.\n\n` +
                `KURALLAR:\n` +
                `- SADECE Türkçe yaz. İngilizce kelime KULLANMA.\n` +
                `- Markdown kullan: 2 adet "## Alt Başlık" ve her birinin altında 1 paragraf.\n` +
                `- Toplam 120-180 kelime. Akıcı, bilgilendirici, doğal dil.\n` +
                `- Aynı cümleyi TEKRARLAMA. Her bölüm farklı bilgi versin.\n` +
                (keywords.length
                    ? `- Şu anahtar kelimeleri doğal biçimde geçir: ${keywords.join(", ")}.\n`
                    : "") +
                `\nBAŞLIK: ${title}\n\nYAZI:`

            // Blog'a özel: düşük temperature (tutarlı), guardian/tool yükü yok.
            // maxTokens düşük tutuldu — yavaş CPU inference'ta timeout riskini azaltır.
            const aiText = await ayna.generateBlogContent(prompt, {
                temperature: 0.4,
                maxTokens: 600,
            })

            if (!aiText || aiText.length < 50) {
                throw new Error("AI boş veya çok kısa içerik döndürdü")
            }

            const excerpt =
                aiText
                    .split("\n")
                    .find((l: string) => l.trim() && !l.trim().startsWith("#"))
                    ?.slice(0, 200) || title

            await blogService.updateBlogPosts([
                {
                    id: postId,
                    content: aiText,
                    excerpt,
                    seo_description: excerpt,
                    status: "draft", // editör onayından sonra publish
                } as any,
            ])
            logger.info(`[admin/blog/generate] ✅ AI içerik tamamlandı: ${slug} (${aiText.length} karakter)`)
        } catch (err: any) {
            logger.error(`[admin/blog/generate] AI üretim hatası (${slug}): ${err.message}`)
            // Dürüstlük: sessiz kalma — taslağa hata notu yaz
            await blogService
                .updateBlogPosts([
                    {
                        id: postId,
                        content:
                            `_AI içerik üretilemedi: ${err.message}_\n\n` +
                            `Lütfen Ollama/Gemini erişimini kontrol edip tekrar deneyin, ` +
                            `veya içeriği elle yazın.`,
                        status: "draft",
                    } as any,
                ])
                .catch(() => {})
        }
    })()

    // 3. Hemen dön (202 Accepted — üretim devam ediyor)
    res.status(202).json({ post, message: "İçerik üretimi başlatıldı. Birkaç dakika içinde hazır olacak." })
}
