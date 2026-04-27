import {
    createWorkflow,
    WorkflowResponse,
    createStep,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"

// ADIM: Yazıyı Veritabanına Yaz
const createPostStep = createStep(
    "create-post-step",
    async (input: { title: string; content: string; slug: string }, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any

        // Servis üzerinden oluşturma
        const post = await contentModule.createPosts(input)

        // Başarılı olursa veriyi ve ID'yi dön (Compensation için ID lazım)
        return new StepResponse(post, post.id)
    },
    // COMPENSATION (TELAFİ): Hata olursa bu fonksiyon çalışır
    async (id, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        // Oluşturulan o yazıyı sil
        await contentModule.deletePosts([id])
    }
)

// WORKFLOW: Süreci Yöneten Orkestra Şefi
export const createPostWorkflow = createWorkflow(
    "create-post",
    (input: any) => {
        const post = createPostStep(input)
        return new WorkflowResponse(post)
    }
)
