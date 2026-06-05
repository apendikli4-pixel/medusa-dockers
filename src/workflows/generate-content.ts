import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"
import { TENANT_MODULE } from "../modules/tenant"
import { ollamaGenerate } from "../lib/ollama-client"

// =============================================================================
// ADIM 1: Ürün Verisini Çek
// =============================================================================
const getProductStep = createStep(
    "get-product-for-content",
    async (input: { productId: string }, { container }) => {
        const productModule = container.resolve(Modules.PRODUCT) as any
        const product = await productModule.retrieveProduct(input.productId)
        return new StepResponse(product)
    }
)

// =============================================================================
// ADIM 1.5: Tenant Bağlamını Çek (Sektörel İçerik Ajanı Desteği)
// =============================================================================
const getTenantContextStep = createStep(
    "get-tenant-context-for-content",
    async (input: { tenantId?: string }, { container }) => {
        if (!input.tenantId) {
            return new StepResponse(null)
        }
        try {
            const tenantService = container.resolve(TENANT_MODULE) as any
            const context = await tenantService.getTenantContext(input.tenantId)
            return new StepResponse(context)
        } catch {
            // Tenant modülü hazır değilse sessizce geç
            return new StepResponse(null)
        }
    }
)

// =============================================================================
// ADIM 2: GERÇEK YAPAY ZEKA (GEMINI) İLE İÇERİK ÜRET
// =============================================================================
const generateAIContentStep = createStep(
    "generate-ai-content",
    async (input: { product: any; tenantContext: any }, { container }) => {
        const product = input.product
        const tenantCtx = input.tenantContext

        // ─── Sektörel bağlam bilgisi (Sektörel İçerik Ajanı desteği) ───
        const sectorInstruction = tenantCtx
            ? `
            ÖNEMLİ BAĞLAM:
            Bu ürün "${tenantCtx.name}" mağazasına aittir.
            Sektör: ${tenantCtx.sector}
            İçerik tonu: ${tenantCtx.sectorConfig.tone}
            İçerik stili: ${tenantCtx.sectorConfig.contentStyle}
            Uzmanlık alanları: ${tenantCtx.sectorConfig.expertise.join(", ")}
            Dil: ${tenantCtx.locale}
            Para birimi: ${tenantCtx.currency}
            İçeriği bu mağazanın sektörüne ve üslubuna uygun yaz.
            `
            : ""

        // Zekaya verilecek emir (Prompt Engineering)
        const prompt = `
            Sen profesyonel bir SEO uzmanı ve metin yazarısın.
            Aşağıdaki ürün için Türkçe, satış odaklı bir blog yazısı hazırla.
            ${sectorInstruction}
            Ürün Adı: ${product.title}
            Ürün Açıklaması (Varsa): ${product.description || "Bu harika bir ürün."}
            
            Lütfen yanıtı SADECE geçerli bir JSON formatında ver. Başka hiçbir metin ekleme.
            JSON Formatı şöyle olmalı:
            {
                "title": "Çarpıcı bir başlık",
                "slug": "url-dostu-slug",
                "content": "HTML formatında zengin içerik (p, h2, ul etiketleri kullan)",
                "status": "published"
            }
        `

        try {
            const text = await ollamaGenerate(prompt, { temperature: 0.5, maxTokens: 1500, json: true })

            // JSON temizliği (Bazen AI markdown ```json ... ``` ekler, onu temizleyelim)
            const cleanJson = text.replace(/```json|```/g, "").trim()
            const aiData = JSON.parse(cleanJson)

            return new StepResponse(aiData)

        } catch (error) {
            console.error("Yapay Zeka Krizi:", error)
            // Fallback (Yedek Plan): Eğer AI çökerse sistemi durdurma, manuel taslak oluştur.
            return new StepResponse({
                title: `${product.title} (Taslak)`,
                slug: `${product.handle}-taslak`,
                content: "<p>Yapay zeka bağlantısında sorun oluştu. Lütfen manuel düzenleyin.</p>",
                status: "draft"
            })
        }
    }
)

// =============================================================================
// ADIM 3: İçeriği Veritabanına Kaydet
// =============================================================================
const createPostStep = createStep(
    "create-post-from-ai",
    async (input: any, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        // Slug çakışmasını önlemek için timestamp ekle
        const finalSlug = `${input.slug}-${Date.now()}`

        const post = await contentModule.createPosts({
            ...input,
            slug: finalSlug
        })
        return new StepResponse(post, post.id)
    },
    async (postId, { container }) => {
        if (!postId) return
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        await contentModule.deletePosts([postId])
    }
)

// =============================================================================
// WORKFLOW ORKESTRASYONU
// =============================================================================
export const generateContentWorkflow = createWorkflow(
    "generate-seo-post-workflow",
    (input: { productId: string; tenantId?: string }) => {
        const product = getProductStep({ productId: input.productId })
        const tenantContext = getTenantContextStep({ tenantId: input.tenantId })
        const generatedData = generateAIContentStep({ product, tenantContext })
        const post = createPostStep(generatedData)
        return new WorkflowResponse(post)
    }
)

export default generateContentWorkflow
