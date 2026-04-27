import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const contentEngine = req.scope.resolve("content_engine") as any
    const slug = req.params.slug

    try {
        const [posts] = await contentEngine.listAndCountPosts(
            {
                slug: slug,
                status: "published"
            },
            {
                take: 1,
                select: ["id", "title", "slug", "content", "published_at"]
            }
        )

        if (!posts?.length) {
            res.status(404).json({ message: "Yazı bulunamadı" })
            return
        }

        res.json({ post: posts[0] })
    } catch (error: any) {
        console.error("Store Blog Detail Error:", error)
        res.status(500).json({ message: "Internal Error", error: error.message })
    }
}
