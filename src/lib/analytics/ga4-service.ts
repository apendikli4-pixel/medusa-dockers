import { BetaAnalyticsDataClient } from "@google-analytics/data"

export interface TrafficStats {
    activeUsers: number
    sessions: number
    screenPageViews: number
    bounceRate: number
    isMock: boolean
}

export interface TopPage {
    pageTitle: string
    pagePath: string
    views: number
}

export class GA4Service {
    private client: BetaAnalyticsDataClient | null = null
    private propertyId: string | null = null
    private isMockMode: boolean = true

    constructor() {
        // Çevre değişkenlerinden GA4 kimlik bilgilerini oku
        this.propertyId = process.env.GA4_PROPERTY_ID || null
        const clientEmail = process.env.GA4_CLIENT_EMAIL
        const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n') // .env'den gelen \n karakterlerini düzelt

        if (this.propertyId && clientEmail && privateKey) {
            try {
                this.client = new BetaAnalyticsDataClient({
                    credentials: {
                        client_email: clientEmail,
                        private_key: privateKey
                    }
                })
                this.isMockMode = false
                console.log("[GA4Service] Google Analytics bağlantısı başarılı. (Real Mode)")
            } catch (e) {
                console.error("[GA4Service] GA4 client başlatılamadı, Mock moduna geçiliyor.", e)
                this.isMockMode = true
            }
        } else {
            console.warn("[GA4Service] GA4 kimlik bilgileri eksik (.env kontrol edin). Sisteme zarar vermemek için Mock (Simülasyon) modunda çalışacak.")
            this.isMockMode = true
        }
    }

    /**
     * Son X günlük genel trafik özetini getirir
     */
    async getTrafficStats(days: number = 7): Promise<TrafficStats> {
        if (this.isMockMode || !this.client || !this.propertyId) {
            // Mock Data
            return {
                activeUsers: Math.floor(Math.random() * 500) + 100,
                sessions: Math.floor(Math.random() * 800) + 200,
                screenPageViews: Math.floor(Math.random() * 2500) + 500,
                bounceRate: parseFloat((Math.random() * (0.8 - 0.3) + 0.3).toFixed(2)), // %30 - %80 arası
                isMock: true
            }
        }

        try {
            const [response] = await this.client.runReport({
                property: `properties/${this.propertyId}`,
                dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'bounceRate' }
                ],
            })

            const row = response.rows?.[0]
            if (!row || !row.metricValues) {
                throw new Error("GA4 API'den boş veri döndü")
            }

            return {
                activeUsers: parseInt(row.metricValues[0].value || "0", 10),
                sessions: parseInt(row.metricValues[1].value || "0", 10),
                screenPageViews: parseInt(row.metricValues[2].value || "0", 10),
                bounceRate: parseFloat(row.metricValues[3].value || "0"),
                isMock: false
            }
        } catch (error: any) {
            console.error("[GA4Service] getTrafficStats hatası:", error.message)
            throw new Error(`Analytics verisi alınamadı: ${error.message}`)
        }
    }

    /**
     * En çok görüntülenen sayfaları getirir
     */
    async getTopPages(days: number = 7, limit: number = 5): Promise<TopPage[]> {
        if (this.isMockMode || !this.client || !this.propertyId) {
            // Mock Data
            return [
                { pageTitle: "Ana Sayfa - Aqua Havuz", pagePath: "/", views: Math.floor(Math.random() * 1000) + 500 },
                { pageTitle: "Havuz Temizleme Robotları", pagePath: "/categories/robotlar", views: Math.floor(Math.random() * 500) + 100 },
                { pageTitle: "Kışlık Havuz Bakım Kimyasalları", pagePath: "/categories/kimyasallar", views: Math.floor(Math.random() * 300) + 50 },
                { pageTitle: "İletişim", pagePath: "/pages/iletisim", views: Math.floor(Math.random() * 100) + 20 },
                { pageTitle: "Sepet", pagePath: "/cart", views: Math.floor(Math.random() * 200) + 50 },
            ]
        }

        try {
            const [response] = await this.client.runReport({
                property: `properties/${this.propertyId}`,
                dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
                dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
                metrics: [{ name: 'screenPageViews' }],
                orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                limit
            })

            if (!response.rows) return []

            return response.rows.map(row => ({
                pageTitle: row.dimensionValues?.[0].value || "Bilinmiyor",
                pagePath: row.dimensionValues?.[1].value || "/",
                views: parseInt(row.metricValues?.[0].value || "0", 10)
            }))
        } catch (error: any) {
            console.error("[GA4Service] getTopPages hatası:", error.message)
            throw new Error(`Analytics verisi alınamadı: ${error.message}`)
        }
    }
}

// Singleton pattern
export const ga4Service = new GA4Service()
