import {
    createWorkflow,
    WorkflowResponse,
    createStep,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"

// ADIM: Yazıyı Güncelle
const updatePostStep = createStep(
    "update-post-step",
    async (input: { id: string; title: string; content: string; slug: string; image?: string; metadata?: any }, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any

        // Compensation için güncelleme öncesi mevcut veriyi al
        const originalPosts = await contentModule.listPosts({ id: input.id })
        const original = originalPosts?.[0] || null

        const dataToUpdate = {
            id: input.id,
            title: input.title,
            content: input.content,
            slug: input.slug,
            image: input.image,
            metadata: input.metadata
        }

        const post = await contentModule.updatePosts([dataToUpdate])

        return new StepResponse(post, original)
    },
    // Compensation: güncelleme başarısız olursa orijinal veriye geri dön
    async (original: any, { container }) => {
        if (!original) return
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        try {
            await contentModule.updatePosts([{
                id: original.id,
                title: original.title,
                content: original.content,
                slug: original.slug,
                image: original.image,
                metadata: original.metadata,
            }])
        } catch (e) {
            // Compensation kendisi başarısız — kaynak durumu manuel inceleme gerektirir
        }
    }
)

// WORKFLOW: Güncelleme Akışı
export const updatePostWorkflow = createWorkflow(
    "update-post",
    (input: any) => {
        const post = updatePostStep(input)
        return new WorkflowResponse(post)
    }
)
