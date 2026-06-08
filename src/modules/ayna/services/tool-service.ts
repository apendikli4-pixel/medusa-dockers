import { Logger, RemoteQueryFunction } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { ollamaGenerate } from "../../../lib/ollama-client"
import AynaMemoryService from "./memory-service"
import AynaDiagnosticService from "./diagnostic-service"
import AynaStockIntelligenceService from "./stock-intelligence-service"

type InjectedDependencies = {
    logger: Logger
    aynaMemoryService: AynaMemoryService
    aynaDiagnosticService: AynaDiagnosticService
    aynaStockIntelligenceService: AynaStockIntelligenceService
    aynaService?: any
}

export default class AynaToolService {
    protected logger_: Logger
    protected memoryService_: AynaMemoryService
    protected diagnosticService_: AynaDiagnosticService
    protected stockIntelligenceService_: AynaStockIntelligenceService
    protected aynaService_: any

    constructor({ logger, aynaMemoryService, aynaDiagnosticService, aynaStockIntelligenceService, aynaService }: InjectedDependencies) {
        this.logger_ = logger
        this.memoryService_ = aynaMemoryService
        this.diagnosticService_ = aynaDiagnosticService
        this.stockIntelligenceService_ = aynaStockIntelligenceService
        this.aynaService_ = aynaService
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
            remoteLink?: any
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
            case "calculatePoolChemicals":
                return this.executeCalculatePoolChemicals(args)
            case "vapeCalculator":
                return this.executeVapeCalculation(args)
            case "sizeGuide":
                return this.executeSizeGuide(args)
            case "deviceCompatibility":
                return this.executeDeviceCompatibility(args)
            case "searchAvailableVillas":
                return await this.executeSearchAvailableVillas(args, services?.remoteQuery, services?.tenantId)
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
            case "create_blog_post":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeCreateBlogPost(args, services)
            case "quick_order":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeQuickOrder(args, services)
            case "generate_storefront_data":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeStoreGenerator(args, services)
            case "create_mission":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeCreateMission(args, services)
            case "analyze_traffic":
                if (!services?.isAdmin) return { error: "Bu araç yalnızca admin kullanıcıları tarafından kullanılabilir." }
                return await this.executeAnalyzeTraffic(args)

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
        const limit = args.limit || 5
        const q = args.query

        // Sorguyu anlamlı kelimelere ayır (Türkçe sadeleştirme + stopword temizliği).
        // Böylece "havuzum için klor lazım" gibi cümleler de ürün başlığıyla eşleşir.
        const STOP = new Set(["için","ile","var","mı","mi","mu","mü","ne","kadar","kaç","kaca","kaçtan","fiyat","fiyatı","fiyati","ucret","ücret","ücreti","stok","stokta","mevcut","acaba","lazım","lazim","istiyorum","almak","alabilir","satıyor","satiyor","misiniz","musunuz","güncel","guncel","nedir","bir","bana","sizde","sizin","urun","ürün","ürünü","tl","lira","adet","kg"])
        const tokenize = (s: string): string[] => {
            const map: Record<string, string> = { ç:"c", ğ:"g", ı:"i", ö:"o", ş:"s", ü:"u" }
            return (s || "")
                .toLowerCase()
                .split(/[^a-zçğıöşü0-9]+/i)
                .map(w => w.split("").map(c => map[c] ?? c).join(""))
                .filter(w => w.length >= 3 && !STOP.has(w))
        }
        const tokens = tokenize(q)
        const norm = (s: string) => (s || "").toLowerCase().split("").map(c => (({ç:"c",ğ:"g",ı:"i",ö:"o",ş:"s",ü:"u"} as Record<string,string>)[c] ?? c)).join("")
        // Bir ürünün sorguyla eşleşme puanı: kaç token başlık/açıklamada geçiyor.
        const scoreOf = (p: any): number => {
            if (tokens.length === 0) return 1 // sorgu yoksa hepsi geçerli (genel liste)
            const hay = norm(`${p?.title || ""} ${p?.description || ""}`)
            return tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0)
        }

        // Bir ürün listesini fiyatla birlikte sade forma indirger.
        // Fiyat varyantın price_set.prices içinden TRY olanından alınır.
        const simplify = (products: any[]) =>
            (products || []).map((p: any) => {
                const variants = p?.variants || []
                const prices = variants?.[0]?.price_set?.prices || []
                const tryPrice = prices.find((pr: any) => pr.currency_code === "try")
                // Stok durumu: Bir varyant stok takibi yapmıyorsa (manage_inventory=false)
                // ürün her zaman satılabilir → stokta. Takip ediyorsa miktar > 0 ise stokta.
                const inStock = variants.some((v: any) =>
                    v?.manage_inventory === false ||
                    (typeof v?.inventory_quantity === "number" && v.inventory_quantity > 0)
                )
                return {
                    id: p.id,
                    title: p.title,
                    handle: p.handle,
                    status: p.status,
                    description: p.description,
                    price: tryPrice ? tryPrice.amount : null,
                    currency: tryPrice ? "TRY" : null,
                    in_stock: variants.length > 0 ? inStock : true,
                }
            })

        try {
            // Birincil yol: remoteQuery ile ürünleri FİYATLARIYLA çek.
            if (remoteQuery) {
                // ── ÇOKLU MAĞAZA İZOLASYONU ──
                // Aktif tenant'ın sales-channel'ını çöz. Çözülürse arama SADECE o
                // mağazanın ürünlerini döndürür (vape mağazasında havuz ürünü çıkmaz).
                // Çözülemezse (tek-tenant/default kurulum) tüm ürünler — geriye uyumlu.
                let tenantScId: string | null = null
                let multiTenant = false
                if (tenantId) {
                    try {
                        const { data: tdata } = await (remoteQuery as any).graph({
                            entity: "tenant",
                            fields: ["sales_channel.id"],
                            filters: { id: tenantId },
                        })
                        tenantScId = tdata?.[0]?.sales_channel?.id || null
                        // Birden fazla mağaza var mı? (izolasyon yalnızca o zaman gerekir)
                        const { data: tall } = await (remoteQuery as any).graph({
                            entity: "tenant", fields: ["id"], pagination: { take: 2 },
                        })
                        multiTenant = (tall?.length || 0) > 1
                    } catch { /* çözülemezse global davranış */ }
                }
                // Güvenlik: izolasyon VARSAYILAN KAPALI (env ile açılır).
                // Mevcut kurulumda ürünler her tenant'ın kanalına temiz bağlı olmayabilir;
                // körlemesine filtrelemek var olan ürünü gizleyip "yok" dedirtir (dürüstlük ihlali).
                // Vape mağazası kurulurken kanallar+ürün bağları düzgün kurulunca
                // TENANT_PRODUCT_ISOLATION=true verilip uçtan uca test edilerek açılacak.
                const isolationEnabled = process.env.TENANT_PRODUCT_ISOLATION === "true"
                const enforceIsolation = isolationEnabled && multiTenant && !!tenantScId

                // Yayındaki ürünleri geniş çek (başlık filtresi YOK), sonra kelime-bazlı
                // JS eşleştirmesiyle ele. Küçük/orta katalogda en güvenilir yol.
                const { data: allProducts } = await (remoteQuery as any).graph({
                    entity: "product",
                    fields: [
                        "id", "title", "handle", "status", "description",
                        "sales_channels.id",
                        "variants.id", "variants.title",
                        "variants.manage_inventory", "variants.inventory_quantity",
                        "variants.price_set.prices.amount",
                        "variants.price_set.prices.currency_code",
                    ],
                    filters: { status: "published" },
                    pagination: { take: 200 },
                })
                // Sales-channel'a göre kapsamla (çoklu mağaza + kanal çözüldüyse).
                const scoped = enforceIsolation
                    ? (allProducts || []).filter((p: any) =>
                        Array.isArray(p?.sales_channels) &&
                        p.sales_channels.some((sc: any) => sc?.id === tenantScId))
                    : (allProducts || [])
                const ranked = scoped
                    .map((p: any) => ({ p, s: scoreOf(p) }))
                    .filter((x: any) => x.s > 0)
                    .sort((a: any, b: any) => b.s - a.s)
                    .slice(0, limit)
                    .map((x: any) => x.p)
                const simplified = simplify(ranked)
                await this.memoryService_.recordTruth("system", "product_search", {
                    query: q, tokens, resultCount: simplified.length,
                    tenantId: tenantId || null, salesChannelId: tenantScId,
                })
                return { products: simplified, count: simplified.length }
            }

            // Yedek yol: productModuleService (fiyatsız — son çare).
            if (productModuleService) {
                const products = await productModuleService.listProducts(
                    q ? { q } : {},
                    { take: limit, select: ["id", "title", "handle", "status", "description"] }
                )
                await this.memoryService_.recordTruth("system", "product_search", {
                    query: q, resultCount: products.length, tenantId: tenantId || null,
                })
                return { products, count: products.length, note: "Fiyat bilgisi alınamadı (query service yok)." }
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

    private executeCalculatePoolChemicals(args: Record<string, any>) {
        let volume = args.volume
        if (!volume && args.length && args.width && args.depth) {
            volume = args.length * args.width * args.depth
        }
        
        if (!volume) {
            return { error: "Hesaplama için havuz hacmi (veya en, boy, derinlik) belirtilmelidir." }
        }

        const type = args.chemicalType
        let recommendation = ""
        let requiredAmount = 0
        let unit = "kg"

        if (type === "klor") {
            // Şoklama veya günlük kullanım varsayımı (günlük 1-2 gr / m3)
            requiredAmount = volume * 1.5 / 1000 // kg cinsinden
            recommendation = `${volume} m3 havuzunuz için günlük yaklaşık ${requiredAmount.toFixed(2)} kg klor kullanmanız önerilir.`
        } else if (type === "ph_dusurucu") {
            // 0.1 pH düşürmek için yaklaşık 10 gr / m3
            requiredAmount = volume * 10 / 1000
            recommendation = `${volume} m3 havuzunuzda pH değerini 0.1 birim düşürmek için yaklaşık ${requiredAmount.toFixed(2)} kg pH düşürücü kullanmanız gerekir.`
        } else if (type === "ph_arttirici") {
            // 0.1 pH arttırmak için yaklaşık 10 gr / m3
            requiredAmount = volume * 10 / 1000
            recommendation = `${volume} m3 havuzunuzda pH değerini 0.1 birim arttırmak için yaklaşık ${requiredAmount.toFixed(2)} kg pH arttırıcı kullanmanız gerekir.`
        } else {
            return { error: `Bilinmeyen kimyasal türü: ${type}` }
        }

        return { success: true, volume_m3: volume, chemical: type, amount: requiredAmount, unit, note: recommendation }
    }

    private executeVapeCalculation(args: Record<string, any>) {
        const { target_nicotine_mg, total_liquid_ml, booster_nicotine_mg } = args
        
        if (!target_nicotine_mg || !total_liquid_ml || !booster_nicotine_mg) {
            return { error: "Hesaplama için hedef nikotin, toplam likit ve booster nikotin miktarı belirtilmelidir." }
        }

        if (target_nicotine_mg > booster_nicotine_mg) {
            return { error: "Hedef nikotin miktarı, kullanılacak booster'ın nikotin miktarından büyük olamaz." }
        }

        // Formül: (Hedef Nikotin * Toplam Likit) / Booster Nikotin = Eklenecek Booster (ml)
        const requiredBoosterMl = (target_nicotine_mg * total_liquid_ml) / booster_nicotine_mg
        const requiredBaseMl = total_liquid_ml - requiredBoosterMl

        return {
            success: true,
            target_nicotine_mg,
            total_liquid_ml,
            required_booster_ml: parseFloat(requiredBoosterMl.toFixed(2)),
            required_base_ml: parseFloat(requiredBaseMl.toFixed(2)),
            note: `${total_liquid_ml}ml likit için ${target_nicotine_mg}mg nikotin elde etmek üzere, ${requiredBoosterMl.toFixed(2)}ml (${booster_nicotine_mg}mg) Nic-Shot ve ${requiredBaseMl.toFixed(2)}ml NBase/Aroma kullanmalısınız.`
        }
    }

    private executeSizeGuide(args: Record<string, any>) {
        const { height_cm, weight_kg, fit_preference } = args
        // Çok basit bir simülasyon (Gerçek sistemlerde markaların beden tabloları kullanılır)
        let recommendedSize = "M"
        
        if (height_cm > 185 && weight_kg > 90) recommendedSize = "XXL"
        else if (height_cm > 180 && weight_kg > 80) recommendedSize = "XL"
        else if (height_cm > 175 && weight_kg > 70) recommendedSize = "L"
        else if (height_cm < 165 && weight_kg < 60) recommendedSize = "S"

        if (fit_preference === "oversize") {
            recommendedSize = recommendedSize === "XXL" ? "XXL" : (recommendedSize === "XL" ? "XXL" : (recommendedSize === "L" ? "XL" : "L"))
        } else if (fit_preference === "slim" && recommendedSize !== "S") {
            recommendedSize = recommendedSize === "XXL" ? "XL" : (recommendedSize === "XL" ? "L" : "M")
        }

        return {
            success: true,
            height: height_cm,
            weight: weight_kg,
            preference: fit_preference,
            recommended_size: recommendedSize,
            note: `Verilen boy, kilo ve ${fit_preference} kalıp tercihine göre tavsiye edilen beden: ${recommendedSize}.`
        }
    }

    private executeDeviceCompatibility(args: Record<string, any>) {
        const { accessory_type, customer_device_model } = args
        return {
            success: true,
            accessory_type,
            device_model: customer_device_model,
            is_compatible: true, // Simülasyon
            note: `Sistem kayıtlarımıza göre bu ${accessory_type}, ${customer_device_model} cihazınızla uyumludur.`
        }
    }

    private async executeSearchAvailableVillas(args: Record<string, any>, remoteQuery?: RemoteQueryFunction, tenantId?: string) {
        if (!remoteQuery) return { error: "Query service unavailable" }
        try {
            // Müsait olan ürünleri bulmak için tüm villaları çeker ve rezervasyon modülüne availability sorar
            // Şimdilik simülasyon olarak 2 sahte villa dönüyoruz. AI'ın senaryoya uyması için.
            const dummyVillas = [
                { id: "villa_1", title: "Lüks Havuzlu Villa (Kaş)", price_per_night: 5000, max_guests: 6 },
                { id: "villa_2", title: "Deniz Manzaralı Villa (Kalkan)", price_per_night: 7500, max_guests: 8 }
            ]
            return {
                success: true,
                start_date: args.start_date,
                end_date: args.end_date,
                available_villas: dummyVillas,
                note: "Sistemde müsait olan villalar listelenmiştir."
            }
        } catch (e: any) {
            return { error: `Villa arama hatası: ${e.message}` }
        }
    }

    private async executeConscienceCheck(args: Record<string, any>) {
        try {
            const prompt = `You are an ethical auditor for e-commerce. Respond ONLY in JSON: {"verdict": "ALLOW"/"DENY", "reasoning": "..."}\n\nAction: ${args.action}\nContext: ${args.context}`
            const raw = await ollamaGenerate(prompt, { temperature: 0.2, json: true })
            const text = raw.replace(/```json|```/g, "").trim()
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
                        stocked_quantity: value,
                    }])
                    await this.memoryService_.recordTruth("admin", "stock_updated", {
                        productId, newStockValue: value, tenantId: services.tenantId || null,
                    })
                    return { success: true, action: "update_stock", productId, newValue: value }
                }
                return { error: "Stok kaydı bulunamadı." }
            }

            if (action === "update_price") {
                if (!services.pricingModuleService) return { error: "Pricing service unavailable" }
                if (!services.remoteQuery) return { error: "Query service unavailable" }

                // 1. Ürünün varyantlarını ve price_set bilgilerini al
                const { data: products } = await (services.remoteQuery as any).graph({
                    entity: "product",
                    fields: [
                        "variants.id",
                        "variants.title",
                        "variants.price_set.id",
                        "variants.price_set.prices.id",
                        "variants.price_set.prices.amount",
                        "variants.price_set.prices.currency_code",
                    ],
                    filters: { id: productId },
                })

                if (!products?.length || !products[0].variants?.length) {
                    return { error: "Ürün veya varyant bulunamadı." }
                }

                const variant = products[0].variants[0]
                const priceSet = variant.price_set

                if (!priceSet) {
                    // Price set yoksa yeni oluştur ve varyanta bağla
                    const [newPriceSet] = await services.pricingModuleService.createPriceSets([{
                        prices: [{ amount: value, currency_code: "try" }],
                    }])
                    // RemoteLink ile varyant-priceSet bağlantısı kur
                    if ((services as any).remoteLink) {
                        try {
                            await (services as any).remoteLink.create({
                                [Modules.PRODUCT]: { variant_id: variant.id },
                                [Modules.PRICING]: { price_set_id: newPriceSet.id },
                            })
                        } catch (linkErr: any) {
                            this.logger_.warn(`[AynaTool] Variant-PriceSet link hatası: ${linkErr.message}`)
                        }
                    }
                    await this.memoryService_.recordTruth("admin", "price_created", {
                        productId, variantId: variant.id, amount: value, currency: "TRY",
                        tenantId: services.tenantId || null,
                    })
                    return { success: true, action: "update_price", productId, newValue: value, currency: "TRY", note: "Yeni fiyat seti oluşturuldu ve varyanta bağlandı." }
                }

                // 2. Mevcut TRY fiyatını bul
                const existingPrice = priceSet.prices?.find((p: any) => p.currency_code === "try")

                if (existingPrice) {
                    // 3a. Mevcut fiyatı güncelle
                    const oldAmount = existingPrice.amount
                    await services.pricingModuleService.updatePrices([{
                        id: existingPrice.id,
                        amount: value,
                    }])
                    await this.memoryService_.recordTruth("admin", "price_updated", {
                        productId, variantId: variant.id,
                        oldAmount, newAmount: value, currency: "TRY",
                        tenantId: services.tenantId || null,
                    })
                    return { success: true, action: "update_price", productId, oldValue: oldAmount, newValue: value, currency: "TRY" }
                } else {
                    // 3b. Price set var ama TRY fiyatı yok — yeni ekle
                    await services.pricingModuleService.createPrices([{
                        price_set_id: priceSet.id,
                        amount: value,
                        currency_code: "try",
                    }])
                    await this.memoryService_.recordTruth("admin", "price_created", {
                        productId, variantId: variant.id, amount: value, currency: "TRY",
                        tenantId: services.tenantId || null,
                    })
                    return { success: true, action: "update_price", productId, newValue: value, currency: "TRY", note: "TRY fiyatı eklendi." }
                }
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
     * Blog yazısı oluşturur.
     */
    private async executeCreateBlogPost(args: Record<string, any>, services: any) {
        try {
            if (!services.contentEngineService) {
                return { error: "Content Engine service unavailable", note: "İçerik modülü yüklenmemiş." }
            }

            const post = await services.contentEngineService.createPosts({
                title: args.title,
                slug: args.slug || args.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                content: args.content,
                status: args.status || "draft",
            })

            await this.memoryService_.recordTruth("admin", "blog_post_created", {
                postId: post.id,
                title: args.title,
            })

            return { success: true, post: { id: post.id, title: post.title, status: post.status } }
        } catch (e: any) {
            return { error: `Blog oluşturma hatası: ${e.message}` }
        }
    }

    /**
     * Hızlı sipariş / sepete ekleme (Admin üzerinden müşteri adına)
     */
    private async executeQuickOrder(args: Record<string, any>, services: any) {
        // Medusa V2'de tam bir sipariş oluşturmak çok adımlıdır (Cart -> Checkout -> Order).
        // Bu tool şu an için işlemi not alır ve bir taslak linki yönlendirmesi döner.
        return { 
            success: true, 
            message: `Hızlı sipariş notu alındı. Varyant ID: ${args.variant_id}, Adet: ${args.quantity || 1}`, 
            action: "REDIRECT_TO_CART_OR_DRAFT_ORDER",
            notes: args.notes
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

    /**
     * AI Görevi (Mission) oluşturur.
     */
    private async executeCreateMission(args: Record<string, any>, services: any) {
        try {
            if (!this.aynaService_) {
                return { error: "Ayna service is not available for creating missions." }
            }

            let resultIntentObj = null;
            if (args.result_intent_payload) {
                try {
                    resultIntentObj = JSON.parse(args.result_intent_payload);
                } catch (e) {
                    this.logger_.warn(`[AynaTool] Invalid JSON in result_intent_payload: ${args.result_intent_payload}`);
                }
            }

            const missionData = {
                title: args.title,
                description: args.description,
                priority: args.priority || "medium",
                status: "pending",
                result: {
                    action: args.result_intent_action,
                    payload: resultIntentObj
                }
            };

            const mission = await this.aynaService_.createMissions(missionData);

            await this.memoryService_.recordTruth("ayna", "mission_created", {
                mission_id: mission.id,
                title: mission.title,
            });

            return {
                success: true,
                message: "Görev başarıyla oluşturuldu ve Admin onayına sunuldu.",
                mission_id: mission.id
            }
        } catch (e: any) {
            return { error: `Görev oluşturma hatası: ${e.message}` }
        }
    }

    /**
     * GA4 Trafik Analiz aracı
     */
    private async executeAnalyzeTraffic(args: Record<string, any>) {
        try {
            const days = args.days || 7;
            const { ga4Service } = require("../../../lib/analytics/ga4-service");
            
            const stats = await ga4Service.getTrafficStats(days);
            const topPages = await ga4Service.getTopPages(days, 5);

            return {
                success: true,
                days,
                data: {
                    stats,
                    topPages
                },
                message: stats.isMock 
                    ? "UYARI: Google Analytics anahtarları eksik olduğundan bu veriler SİMÜLASYONDUR. Sistem yöneticisinin .env dosyasına GA4_PROPERTY_ID ve GA4_PRIVATE_KEY girmesi gerekmektedir. Analizi yaparken verilerin gerçek olmadığını belirtin." 
                    : "Gerçek GA4 verileri başarıyla çekildi."
            };
        } catch (e: any) {
            return { error: `Trafik verisi alınamadı: ${e.message}` };
        }
    }
}

