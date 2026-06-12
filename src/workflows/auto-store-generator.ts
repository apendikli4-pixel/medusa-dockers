import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"

type StoreGeneratorInput = {
    concept_name: string
    categories: { name: string; description: string }[]
    products: { title: string; description: string; category_name: string; price: number }[]
    blog_post: { title: string; content: string }
    sales_channel_id?: string
}

// =============================================================================
// ADIM 1: Kategorileri Oluştur
// =============================================================================
const createStoreCategoriesStep = createStep(
    "create-store-categories",
    async (input: { categories: any[] }, { container }) => {
        const productModule = container.resolve(Modules.PRODUCT) as any
        const createdCategories = []
        
        for (const cat of input.categories) {
            const category = await productModule.createProductCategories({
                name: cat.name,
                handle: cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                description: cat.description,
                is_active: true,
                is_internal: false
            })
            createdCategories.push({ name: cat.name, id: category.id })
        }
        
        return new StepResponse(createdCategories, createdCategories.map(c => c.id))
    },
    async (categoryIds, { container }) => {
        if (!categoryIds || categoryIds.length === 0) return
        const productModule = container.resolve(Modules.PRODUCT) as any
        try {
            await productModule.deleteProductCategories(categoryIds)
        } catch (e) {
            console.error("Rollback failed for categories", e)
        }
    }
)

// =============================================================================
// ADIM 2: Ürünleri Oluştur
// =============================================================================
const createStoreProductsStep = createStep(
    "create-store-products",
    async (input: { products: any[], categoryMap: { name: string, id: string }[], sales_channel_id?: string }, { container }) => {
        const productModule = container.resolve(Modules.PRODUCT) as any
        const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any
        const pricingModule = container.resolve(Modules.PRICING) as any
        
        // Satış kanalını bul
        let salesChannels: { id: string }[] = []
        if (input.sales_channel_id) {
            salesChannels = [{ id: input.sales_channel_id }]
        } else {
            try {
                if (salesChannelModule) {
                    const [defaultChannel] = await salesChannelModule.listSalesChannels({}, { take: 1 })
                    if (defaultChannel) salesChannels = [{ id: defaultChannel.id }]
                }
            } catch (e) {}
        }

        const createdProductIds = []
        
        for (const prod of input.products) {
            // İlgili kategoriyi bul
            const category = input.categoryMap.find(c => c.name.toLowerCase() === prod.category_name.toLowerCase())
            const categories = category ? [{ id: category.id }] : []
            
            const handle = `${prod.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString().slice(-4)}`
            
            const product = await productModule.createProducts({
                title: prod.title,
                handle: handle,
                description: prod.description,
                status: "published",
                categories,
                sales_channels: salesChannels
            })
            
            await productModule.createProductVariants({
                product_id: product.id,
                title: "Default",
                sku: `SKU-${handle}`,
                manage_inventory: true,
                inventory_items: []
            })
            
            if (prod.price && pricingModule) {
                try {
                    await pricingModule.createPriceSets([{
                        prices: [{ amount: prod.price, currency_code: "try" }],
                        rules: []
                    }])
                } catch (e) {}
            }
            
            createdProductIds.push(product.id)
        }
        
        return new StepResponse(createdProductIds, createdProductIds)
    },
    async (productIds, { container }) => {
        if (!productIds || productIds.length === 0) return
        const productModule = container.resolve(Modules.PRODUCT) as any
        try {
            await productModule.deleteProducts(productIds)
        } catch (e) {
            console.error("Rollback failed for products", e)
        }
    }
)

// =============================================================================
// ADIM 3: İlk Blog Yazısını Oluştur
// =============================================================================
const createStoreBlogStep = createStep(
    "create-store-blog",
    async (input: { blog_post: any, concept_name: string }, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        
        const slug = `hosgeldiniz-${input.concept_name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`
        
        const post = await contentModule.createPosts({
            title: input.blog_post.title,
            slug: slug,
            content: input.blog_post.content,
            status: "published"
        })
        
        return new StepResponse(post.id, post.id)
    },
    async (postId, { container }) => {
        if (!postId) return
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        try {
            await contentModule.deletePosts([postId])
        } catch (e) {
            console.error("Rollback failed for blog post", e)
        }
    }
)

// =============================================================================
// WORKFLOW ORKESTRASYONU (SAGA)
// =============================================================================
export const autoStoreGeneratorWorkflow = createWorkflow(
    "auto-store-generator-workflow",
    function (input: StoreGeneratorInput) {
        // 1. Kategoriler oluşturulur, ID'ler alınır
        const categoryMap = createStoreCategoriesStep({ categories: input.categories })
        
        // 2. Ürünler ait oldukları kategori ID'si ve satış kanalı ile oluşturulur
        const products = createStoreProductsStep({ 
            products: input.products, 
            categoryMap,
            sales_channel_id: input.sales_channel_id 
        })
        
        // 3. Blog yayına alınır
        const blogPost = createStoreBlogStep({ blog_post: input.blog_post, concept_name: input.concept_name })
        
        return new WorkflowResponse({
            success: true,
            categoriesCreated: input.categories.length,
            productsCreated: input.products.length,
            blogPostCreated: true
        })
    }
)

export default autoStoreGeneratorWorkflow
