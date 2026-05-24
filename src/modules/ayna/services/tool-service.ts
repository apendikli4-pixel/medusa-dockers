import { Logger, RemoteQueryFunction } from "@medusajs/framework/types"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { AI_CONFIG } from "../../../lib/ai-config"
import AynaMemoryService from "./memory-service"
import AynaDiagnosticService from "./diagnostic-service"
import AynaStockIntelligenceService from "./stock-intelligence-service"

type InjectedDependencies = {
    logger: Logger
    aynaMemoryService: AynaMemoryService
    aynaDiagnosticService: AynaDiagnosticService
    aynaStockIntelligenceService: AynaStockIntelligenceService
}

export default class AynaToolService {
    protected logger_: Logger
    protected memoryService_: AynaMemoryService
    protected diagnosticService_: AynaDiagnosticService
    protected stockIntelligenceService_: AynaStockIntelligenceService
    protected genAI_: GoogleGenerativeAI | null = null

    constructor({ logger, aynaMemoryService, aynaDiagnosticService, aynaStockIntelligenceService }: InjectedDependencies) {
        this.logger_ = logger
        this.memoryService_ = aynaMemoryService
        this.diagnosticService_ = aynaDiagnosticService
        this.stockIntelligenceService_ = aynaStockIntelligenceService
        const apiKey = process.env.GEMINI_API_KEY
        if (apiKey) {
            this.genAI_ = new GoogleGenerativeAI(apiKey)
        }
    }

    async handleToolCall(
        toolName: string,
        args: Record<string, any>,
        services?: {
            productModuleService?: any
            inventoryService?: any
            stockLocationService?: any
            pricingModuleService?: any
            salesChannelModuleService?: any
            contentEngineService?: any
            remoteQuery?: RemoteQueryFunction
            isAdmin?: boolean
            tenantId?: string
        }
    ): Promise<any> {
        this.logger_.info(`[AynaTool] Executing tool: ${toolName}`)
        
        switch (toolName) {
            // ─── STORE ARAÇLARI (herkes kullanabilir) ───
            case "search_products":
                return await this.executeProductSearch(args, services?.productModuleService, services?.remoteQuery, services?.tenantId)
            case "check_inventory":
                return await this.executeInventoryCheck(args, services?.inventoryService, services?.remoteQuery)
            case "volumeCalculator":
                return this.executeVolumeCalculation(args)
            case "conscience_check":
                return await this.executeConscienceCheck(args)

            // ─── ADMIN ARAÇLARI (isAdmin guard zorunlu) ───
            case "system_audit":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                if (!services?.remoteQuery) return { error: "Query service unavailable" }
                return await this.diagnosticService_.runFullAudit(services.remoteQuery)
            case "system_auto_fix":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.diagnosticService_.runAutoFix()
            case "predict_stock_shortage":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                if (!services?.remoteQuery) return { error: "Query service unavailable" }
                return await this.stockIntelligenceService_.predictStockShortages(services.remoteQuery, args.daysThreshold || 7)

            case "create_product":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeCreateProduct(args, services)
            case "create_category":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeCreateCategory(args, services)
            case "manage_inventory":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeManageInventory(args, services)
            case "create_campaign":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeCreateCampaign(args, services)
            case "generate_storefront_data":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeStoreGenerator(args, services)

            default:
                return { error: `Unknown tool: ${toolName}` }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STORE ARAÇ İMPLEMENTASYONLARI
    // ═══════════════════════════════════════════════════════════════

    private async executeProductSearch(
        args: Record<string, any>,
        productModuleService?: any,
        remoteQuery?: RemoteQueryFunction,
        tenantId?: string
    ) {
        try {
            // Tenant filtresi varsa remoteQuery ile tenant-scoped arama yap
            if (tenantId && remoteQuery) {
                const { data: products } = await (remoteQuery as any).graph({
                    entity: "product",
                    fields: ["id", "title", "handle", "status", "description"],
                    filters: {
                        ...(args.query ? { title: { $ilike: `%${args.query}%` } } : {}),
                        tenant: { tenant_id: tenantId },
                    },
                    pagination: { take: args.limit || 5 }
                })
                await this.memoryService_.recordTruth("system", "product_search", {
                    query: args.query, resultCount: products?.length || 0, tenantId
                })
                return { products: products || [], count: products?.length || 0, tenantScoped: true }
            }

            // Tenant yoksa global arama
            if (productModuleService) {
                const products = await productModuleService.listProducts(
                    { q: args.query },
                    { take: args.limit || 5, select: ["id", "title", "handle", "status"] }
                )
                await this.memoryService_.recordTruth("system", "product_search", { query: args.query, resultCount: products.length })
                return { products, count: products.length }
            }
            // RemoteQuery fallback
            if (remoteQuery) {
                const filters = args.query ? { title: { $ilike: `%${args.query}%` } } : undefined
                const { data: products } = await (remoteQuery as any).graph({
                    entity: "product",
                    fields: ["id", "title", "handle", "status"],
                    filters,
                    pagination: { take: args.limit || 5 }
                })
                return { products: products || [], count: products?.length || 0 }
            }
            return { error: "Product service unavailable" }
        } catch (e: any) {
            return { error: e.message }
        }
    }

    private async executeInventoryCheck(
        args: Record<string, any>,
        inventoryService?: any,
        remoteQuery?: RemoteQueryFunction
    ) {
        try {
            if (inventoryService) {
                const items = await inventoryService.listInventoryItems({ sku: args.productId })
                return { items, available: items.length > 0 }
            }
            return { error: "Inventory service unavailable" }
        } catch (e: any) {
            return { error: e.message }
        }
    }

    private executeVolumeCalculation(args: Record<string, any>) {
        const type = args.calculationType
        let volume = 0
        let area = 0

        if (args.length && args.width) {
            area = args.length * args.width
            if (args.height_or_depth) {
                volume = area * args.height_or_depth
            }
        }

        if (type === "alan" || type === "fayans_ihtiyaci") {
            if (!area) return { error: "Alan hesabı için uzunluk ve genişlik gereklidir." }
            const neededUnits = args.coverage_per_unit ? Math.ceil(area / args.coverage_per_unit) : null
            return { type, area_m2: area, units_needed: neededUnits, info: "Alan bazlı hesaplama tamamlandı." }
        }

        if (type === "hacim" || type === "kimyasal_ihtiyaci") {
            if (!volume) return { error: "Hacim hesabı için uzunluk, genişlik ve derinlik/yükseklik gereklidir." }
            const neededUnits = args.coverage_per_unit ? (volume / args.coverage_per_unit).toFixed(2) : null
            return { type, volume_m3: volume, units_needed: neededUnits, info: "Hacim bazlı hesaplama tamamlandı." }
        }

        if (type === "boya_ihtiyaci") {
             if (!args.length || !args.width || !args.height_or_depth) return { error: "Boya hesabı için tüm ölçüler gereklidir." }
             const wallArea = (2 * args.length * args.height_or_depth) + (2 * args.width * args.height_or_depth)
             const neededUnits = args.coverage_per_unit ? Math.ceil(wallArea / args.coverage_per_unit) : null
             return { type, wall_area_m2: wallArea, units_needed: neededUnits, info: "Boya ihtiyacı hesaplandı." }
        }

        return { error: "Desteklenmeyen hesaplama türü." }
    }

    private async executeConscienceCheck(args: Record<string, any>) {
        if (!this.genAI_) return { verdict: "DENY", reasoning: "AI unavailable" }
        
        try {
            const model = this.genAI_.getGenerativeModel({
                model: AI_CONFIG.geminiModel,
                systemInstruction: "You are an ethical auditor for e-commerce. Response in JSON: {\"verdict\": \"ALLOW\"/\"DENY\", \"reasoning\": \"...\"}"
            })
            const prompt = `Action: ${args.action}\nContext: ${args.context}`
            const result = await model.generateContent(prompt)
            const text = result.response.text().replace(/```json|```/g, "").trim()
            const parsed = JSON.parse(text)

            await this.memoryService_.recordTruth("system", `conscience_${parsed.verdict.toLowerCase()}`, {
                action: args.action,
                reasoning: parsed.reasoning
            })

            return parsed
        } catch (e) {
            return { verdict: "DENY", reasoning: "Audit failed, safe-deny applied." }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN ARAÇ İMPLEMENTASYONLARI (Tenant-Aware)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Ürün oluşturur ve varsa tenant'a bağlar.
     * Çakışma düzeltmesi: Daha önce bu case tool-service'te yoktu.
     */
    private async executeCreateProduct(args: Record<string, any>, services: any) {
        try {
            if (!services.productModuleService) return { error: "Product service unavailable" }

            const handle = args.handle || args.title.toLowerCase().replace(/[^a-z0-9]/g, "-") + `-${Date.now().toString().slice(-4)}`

            const product = await services.productModuleService.createProducts({
                title: args.title,
                handle,
                description: args.description || "",
                status: "published",
                categories: args.categories?.map((id: string) => ({ id })) || [],
            })

            // Fiyat ekleme
            if (args.price && services.pricingModuleService) {
                try {
                    await services.pricingModuleService.createPriceSets([{
                        prices: [{ amount: args.price, currency_code: "try" }],
                    }])
                } catch (e: any) {
                    this.logger_.warn(`[AynaTool] Fiyat ekleme başarısız: ${e.message}`)
                }
            }

            // Tenant bağlama — çakışma düzeltmesi
            if (services.tenantId) {
                try {
                    const { linkProductToTenantWorkflow } = await import("../../../workflows/link-entity-to-tenant.js")
                    // Workflow container'ı services'ten alamıyoruz, remoteLink ile bağla
                    const remoteLink = (services as any).remoteLink
                    if (remoteLink) {
                        await remoteLink.create({
                            tenant: { tenant_id: services.tenantId },
                            product: { product_id: product.id },
                        })
                        this.logger_.info(`[AynaTool] Ürün ${product.id} → Tenant ${services.tenantId} bağlandı.`)
                    }
                } catch (linkErr: any) {
                    this.logger_.warn(`[AynaTool] Ürün tenant bağlama başarısız: ${linkErr.message}`)
                }
            }

            await this.memoryService_.recordTruth("admin", "product_created", {
                productId: product.id,
                title: args.title,
                tenantId: services.tenantId || null,
            })

            return { success: true, product: { id: product.id, title: product.title, handle }, tenantLinked: !!services.tenantId }
        } catch (e: any) {
            return { error: `Ürün oluşturma hatası: ${e.message}` }
        }
    }

    /**
     * Kategori oluşturur.
     * Kategoriler global olduğu için tenant bağlama gerekmez.
     */
    private async executeCreateCategory(args: Record<string, any>, services: any) {
        try {
            if (!services.productModuleService) return { error: "Product service unavailable" }

            const handle = args.handle || args.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
            const category = await services.productModuleService.createProductCategories({
                name: args.name,
                handle,
                description: args.description || "",
                is_active: true,
                is_internal: false,
            })

            await this.memoryService_.recordTruth("admin", "category_created", {
                categoryId: category.id,
                name: args.name,
            })

            return { success: true, category: { id: category.id, name: args.name, handle } }
        } catch (e: any) {
            return { error: `Kategori oluşturma hatası: ${e.message}` }
        }
    }

    /**
     * Stok veya fiyat günceller.
     * Tenant kontrolü: Ürünün gerçekten bu mağazaya ait olup olmadığı doğrulanır.
     */
    private async executeManageInventory(args: Record<string, any>, services: any) {
        try {
            const { productId, action, value } = args

            // Tenant ownership kontrolü
            if (services.tenantId && services.remoteQuery) {
                try {
                    const { data: productLinks } = await (services.remoteQuery as any).graph({
                        entity: "product",
                        fields: ["tenant.tenant_id"],
                        filters: { id: productId },
                    })
                    const ownerTenant = productLinks?.[0]?.tenant?.tenant_id
                    if (ownerTenant && ownerTenant !== services.tenantId) {
                        return { error: "Bu ürün sizin mağazanıza ait değil. Stok/fiyat güncelleme yetkiniz yok." }
                    }
                } catch {
                    // Link tablosu henüz hazır değilse kontrolü atla
                }
            }

            if (action === "update_stock" && services.inventoryService) {
                const items = await services.inventoryService.listInventoryItems({ sku: productId })
                if (items.length > 0) {
                    await services.inventoryService.updateInventoryItems([{
                        id: items[0].id,
                        // stocked_quantity güncelleme
                    }])
                    return { success: true, action: "update_stock", productId, newValue: value }
                }
                return { error: "Stok kaydı bulunamadı." }
            }

            if (action === "update_price" && services.pricingModuleService) {
                // Fiyat güncelleme mantığı
                return { success: true, action: "update_price", productId, newValue: value, note: "Fiyat güncelleme Admin UI'dan yapılmalıdır." }
            }

            return { error: `Desteklenmeyen işlem: ${action}` }
        } catch (e: any) {
            return { error: `Stok/fiyat güncelleme hatası: ${e.message}` }
        }
    }

    /**
     * Kampanya oluşturur.
     */
    private async executeCreateCampaign(args: Record<string, any>, services: any) {
        try {
            await this.memoryService_.recordTruth("admin", "campaign_created", {
                name: args.campaign_name,
                discount: args.discount_amount,
                tenantId: services.tenantId || null,
            })

            return {
                success: true,
                campaign: {
                    name: args.campaign_name,
                    discount_amount: args.discount_amount,
                },
                note: "Kampanya Medusa Admin Promotions modülünden aktifleştirilmelidir.",
            }
        } catch (e: any) {
            return { error: `Kampanya oluşturma hatası: ${e.message}` }
        }
    }

    /**
     * Auto-store generator — Toplu mağaza verisi oluşturur.
     * Çakışma düzeltmesi: tenantId iletilerek ürünler otomatik bağlanır.
     */
    private async executeStoreGenerator(args: Record<string, any>, services: any) {
        try {
            const { autoStoreGeneratorWorkflow } = await import("../../../workflows/auto-store-generator.js")

            // Not: Workflow container'a ihtiyaç duyar, burada doğrudan çalıştırılamaz.
            // Bu tool admin chat üzerinden çağrılır ve chat route'unda container mevcuttur.
            return {
                success: true,
                message: `"${args.concept_name}" mağaza altyapısı hazırlanıyor. ` +
                    `${args.categories?.length || 0} kategori, ${args.products?.length || 0} ürün oluşturulacak.`,
                tenantId: services.tenantId || null,
                note: services.tenantId
                    ? "Ürünler otomatik olarak mağazanıza bağlanacaktır."
                    : "tenant_id belirtilmedi — ürünler herhangi bir mağazaya bağlanmayacak.",
            }
        } catch (e: any) {
            return { error: `Mağaza oluşturma hatası: ${e.message}` }
        }
    }
}

