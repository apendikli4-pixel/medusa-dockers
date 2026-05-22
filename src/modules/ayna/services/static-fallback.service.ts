import { Logger, RemoteQueryFunction } from "@medusajs/framework/types"

/**
 * AynaStaticFallbackService — Üçüncül Kurtarma Katmanı (3rd Tier Failsafe)
 * 
 * Yıkılmazlık Zinciri:
 * ┌──────────┐   429/500   ┌──────────┐   timeout   ┌──────────────────┐
 * │  Gemini  │ ──────────▶ │  Ollama  │ ──────────▶ │ Static Fallback  │
 * │ (Tier 1) │             │ (Tier 2) │             │    (Tier 3)      │
 * └──────────┘             └──────────┘             └──────────────────┘
 * 
 * Bu servis, hem Gemini hem Ollama çöktüğünde LLM kullanmadan çalışır.
 * Regex tabanlı kural setiyle kullanıcı girdisini analiz eder ve
 * doğrudan search_products veya check_inventory fonksiyonlarını tetikler.
 * 
 * Kullanıcı ASLA cevapsız bırakılmaz.
 */

interface FallbackResult {
    response: string
    toolTriggered: string | null
    toolResult: any | null
    providerUsed: "static_fallback"
}

interface FallbackDependencies {
    logger: Logger
    productModuleService?: any
    inventoryService?: any
    remoteQuery?: RemoteQueryFunction
}

export default class AynaStaticFallbackService {
    protected logger_: Logger

    constructor(logger: Logger) {
        this.logger_ = logger
    }

    /**
     * LLM olmadan kullanıcı mesajını işler
     */
    async handleMessage(
        message: string,
        deps: FallbackDependencies
    ): Promise<FallbackResult> {
        this.logger_.warn("[AynaFallback] LLM servisleri erişilemez, statik kural seti devrede.")

        const normalized = message.toLowerCase().trim()
        const intent = this.detectIntent(normalized)

        switch (intent.type) {
            case "product_search":
                return await this.handleProductSearch(intent.keywords, deps)

            case "inventory_check":
                return await this.handleInventoryCheck(intent.keywords, deps)

            case "price_inquiry":
                return await this.handlePriceInquiry(intent.keywords, deps)

            case "order_tracking":
                return this.handleOrderTracking()

            case "greeting":
                return this.handleGreeting()

            case "help":
                return this.handleHelp()

            default:
                return this.handleUnknown()
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INTENT TESPİTİ (Regex Tabanlı)
    // ═══════════════════════════════════════════════════════════════

    private detectIntent(message: string): { type: string; keywords: string[] } {
        // ─── Ürün Arama ───
        const productPatterns = [
            /(?:ara|bul|göster|listele|var\s*mı|satıyor\s*musunuz|bakmak\s*istiyorum|ürün)\s+(.+)/i,
            /(.+?)(?:\s+ara|var\s*mı|\s+bul|\s+göster|\s+istiyorum|\s+bakıyorum|\s+arıyorum)/i,
            /(?:pompa|filtre|klor|robot|havuz|motor|kimyasal|liner|aydınlatma|ısıtıcı|kapak|merdiven|el\s*süpürgesi)\b/i,
        ]

        for (const pattern of productPatterns) {
            const match = message.match(pattern)
            if (match) {
                const keywords = (match[1] || match[0])
                    .replace(/[?!.,;]/g, "")
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
                return { type: "product_search", keywords }
            }
        }

        // ─── Stok Kontrolü ───
        const inventoryPatterns = [
            /(?:stok|stokta|mevcut|kalmış|kaç\s*(?:tane|adet)|envanter|kargo)\s+(.+)/i,
            /(.+?)(?:\s+stok(?:ta)?\s*(?:var|mı)|(?:\s+mevcut\s*mu))/i,
        ]

        for (const pattern of inventoryPatterns) {
            const match = message.match(pattern)
            if (match) {
                const keywords = (match[1] || match[0])
                    .replace(/[?!.,;]/g, "")
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
                return { type: "inventory_check", keywords }
            }
        }

        // ─── Fiyat Sorgusu ───
        const pricePatterns = [
            /(?:fiyat|ne\s*kadar|kaç\s*(?:lira|tl)|ücret|maliyet|pahalı|ucuz)/i,
        ]

        for (const pattern of pricePatterns) {
            const match = message.match(pattern)
            if (match) {
                const keywords = message
                    .replace(/[?!.,;]/g, "")
                    .split(/\s+/)
                    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !PRICE_WORDS.has(w))
                return { type: "price_inquiry", keywords }
            }
        }

        // ─── Sipariş Takibi ───
        if (/(?:sipariş|kargo|takip|nerede|teslimat|gönderi)/i.test(message)) {
            return { type: "order_tracking", keywords: [] }
        }

        // ─── Selamlama ───
        if (/^(?:merhaba|selam|hey|günaydın|iyi\s*günler|nasılsın)/i.test(message)) {
            return { type: "greeting", keywords: [] }
        }

        // ─── Yardım ───
        if (/(?:yardım|help|ne\s*yapabilirsin|menü|komut)/i.test(message)) {
            return { type: "help", keywords: [] }
        }

        return { type: "unknown", keywords: [] }
    }

    // ═══════════════════════════════════════════════════════════════
    // ARAÇ TELİKLEME FONKSİYONLARI
    // ═══════════════════════════════════════════════════════════════

    private async handleProductSearch(
        keywords: string[],
        deps: FallbackDependencies
    ): Promise<FallbackResult> {
        const query = keywords.join(" ")

        if (!query) {
            return {
                response: "Hangi ürünü aramak istediğinizi belirtir misiniz? Örneğin: 'havuz pompası' veya 'klor tableti'",
                toolTriggered: null,
                toolResult: null,
                providerUsed: "static_fallback",
            }
        }

        // Doğrudan search_products tetikle
        try {
            if (deps.productModuleService) {
                const products = await deps.productModuleService.listProducts(
                    { q: query },
                    { take: 5, select: ["id", "title", "handle", "status", "description"] }
                )

                if (products && products.length > 0) {
                    const productList = products
                        .map((p: any, i: number) => `${i + 1}. **${p.title}** (/${p.handle})`)
                        .join("\n")

                    return {
                        response: `"${query}" araması için ${products.length} ürün buldum:\n\n${productList}\n\n_Not: Yapay zeka asistanımız şu an bakımda. Detaylı bilgi için ürün sayfalarını ziyaret edebilirsiniz._`,
                        toolTriggered: "search_products",
                        toolResult: { products, count: products.length },
                        providerUsed: "static_fallback",
                    }
                }

                return {
                    response: `"${query}" ile eşleşen ürün bulunamadı. Farklı anahtar kelimelerle tekrar deneyebilirsiniz.\n\n_Not: Yapay zeka asistanımız şu an bakımda, kısa süre içinde daha kapsamlı arama yapılabilecektir._`,
                    toolTriggered: "search_products",
                    toolResult: { products: [], count: 0 },
                    providerUsed: "static_fallback",
                }
            }
        } catch (e: any) {
            this.logger_.error(`[AynaFallback] Product search failed: ${e.message}`)
        }

        return {
            response: `"${query}" ürünleri için arama yapılamadı. Lütfen web sitemizdeki arama özelliğini kullanın veya daha sonra tekrar deneyin.`,
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }

    private async handleInventoryCheck(
        keywords: string[],
        deps: FallbackDependencies
    ): Promise<FallbackResult> {
        const query = keywords.join(" ")

        try {
            if (deps.productModuleService) {
                const products = await deps.productModuleService.listProducts(
                    { q: query },
                    { take: 3, select: ["id", "title", "status"] }
                )

                if (products && products.length > 0) {
                    const statusList = products
                        .map((p: any) => `• **${p.title}**: ${p.status === "published" ? "✅ Satışta" : "❌ Stokta yok"}`)
                        .join("\n")

                    return {
                        response: `Stok durumu:\n\n${statusList}\n\n_Detaylı stok bilgisi için ürün sayfasını kontrol edebilirsiniz._`,
                        toolTriggered: "check_inventory",
                        toolResult: products,
                        providerUsed: "static_fallback",
                    }
                }
            }
        } catch (e: any) {
            this.logger_.error(`[AynaFallback] Inventory check failed: ${e.message}`)
        }

        return {
            response: `Stok bilgisi şu an sorgulanamadı. Lütfen ürün sayfasından kontrol edin veya müşteri hizmetlerimizi arayın.`,
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }

    private async handlePriceInquiry(
        keywords: string[],
        deps: FallbackDependencies
    ): Promise<FallbackResult> {
        // Fiyat bilgisi için de ürün arama tetikle
        return await this.handleProductSearch(keywords, deps)
    }

    private handleOrderTracking(): FallbackResult {
        return {
            response: "Sipariş takibi için lütfen hesabınıza giriş yapın ve **Siparişlerim** sayfasını ziyaret edin. Kargo takip numaranız e-posta adresinize gönderilmiştir.\n\n_Yapay zeka asistanımız şu an bakımdadır. Detaylı sipariş bilgisi için müşteri hizmetlerimize ulaşabilirsiniz._",
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }

    private handleGreeting(): FallbackResult {
        return {
            response: "Merhaba! 👋 Size nasıl yardımcı olabilirim?\n\n• Ürün aramak için ürün adını yazabilirsiniz\n• Stok sorgulamak için \"stokta var mı?\" diye sorabilirsiniz\n• Sipariş takibi için \"siparişim nerede?\" yazabilirsiniz\n\n_Not: Yapay zeka asistanımız şu an sınırlı modda çalışmaktadır._",
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }

    private handleHelp(): FallbackResult {
        return {
            response: "🔧 **Ayna Asistan — Sınırlı Mod**\n\nŞu an temel özellikler aktiftir:\n\n• **Ürün Arama**: _\"havuz pompası göster\"_\n• **Stok Kontrolü**: _\"klor tableti stokta var mı?\"_\n• **Fiyat Bilgisi**: _\"filtre ne kadar?\"_\n• **Sipariş Takibi**: _\"siparişim nerede?\"_\n\nYapay zeka asistanımız kısa süre içinde tam kapasiteye dönecektir.",
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }

    private handleUnknown(): FallbackResult {
        return {
            response: "Talebinizi anlayamadım. Şu an yapay zeka asistanımız bakımda olduğu için sınırlı destek sunabiliyoruz.\n\nŞunları deneyebilirsiniz:\n• Ürün adı yazarak arama yapın\n• \"Yardım\" yazarak kullanılabilir komutları görün\n• Detaylı destek için müşteri hizmetlerimize ulaşın",
            toolTriggered: null,
            toolResult: null,
            providerUsed: "static_fallback",
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// Türkçe stop-word ve fiyat kelimeleri seti
// ═══════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
    "bir", "iki", "bu", "şu", "var", "yok", "mı", "mi", "mu", "mü",
    "ile", "için", "den", "dan", "lütfen", "bana", "benim", "kadar",
    "çok", "biraz", "tane", "adet", "acaba", "olur", "eder", "misin",
    "musun", "nasıl", "hangi", "nerede", "gibi", "daha", "veya", "hem",
])

const PRICE_WORDS = new Set([
    "fiyat", "fiyatı", "kadar", "lira", "ücret", "maliyet",
    "pahalı", "ucuz", "indirim", "kampanya",
])
