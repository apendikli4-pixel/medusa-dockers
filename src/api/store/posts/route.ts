import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    // 1. "content_engine" servisini çağır
    const contentEngine = req.scope.resolve("content_engine") as any

    // 2. URL'den gelen filtreleri al
    const limit = parseInt(req.query.limit as string) || 10
    const offset = parseInt(req.query.offset as string) || 0

    try {
        // 3. Verileri Çek (listAndCountPosts - Medusa v2 standart isimlendirmesi)
        // created_at ve published_at alanlarını ekleyerek 1970 hatasını önlüyoruz.
        const [posts, count] = await contentEngine.listAndCountPosts(
            { status: "published" },
            {
                skip: offset,
                take: limit,
                select: ["id", "title", "slug", "content", "published_at", "created_at"]
            }
        )

        // 4. Cevabı Döndür
        res.json({
            posts: posts || [],
            count: count || 0,
            limit,
            offset,
        })
    } catch (error: any) {
        console.error("Store Blog List Error:", error)
        res.json({ posts: [], count: 0, error: error.message })
    }
}
