import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text, Alert } from "@medusajs/ui"
import { ChartBar, UsersSolid, Eye, DocumentText, ExclamationCircleSolid } from "@medusajs/icons"
import { useEffect, useState } from "react"

type AnalyticsData = {
    stats: {
        activeUsers: number
        sessions: number
        screenPageViews: number
        bounceRate: number
        isMock: boolean
    }
    topPages: {
        pageTitle: string
        pagePath: string
        views: number
    }[]
    days: number
}

const AnalyticsPage = () => {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch("/admin/analytics?days=7", {
                    credentials: "include"
                })
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (e) {
                console.error("Failed to fetch analytics", e)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, [])

    return (
        <Container className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <ChartBar className="text-blue-500 w-8 h-8" />
                <Heading level="h1">Akıllı Analitik (GA4)</Heading>
            </div>

            {loading ? (
                <Text className="text-ui-fg-muted">Analitik verileri yükleniyor...</Text>
            ) : data ? (
                <>
                    {data.stats.isMock && (
                        <div className="mb-8">
                            <Alert variant="warning" title="Sistem Simülasyon (Mock) Modunda">
                                Gerçek Google Analytics (GA4) kimlik bilgileri <code>.env</code> dosyasında bulunamadı. Şu anda gördüğünüz veriler, arayüzü ve yapay zekayı test edebilmeniz için <b>rastgele üretilmiş örnek (mock) verilerdir</b>. 
                                <br/><br/>
                                Gerçek verilere geçmek için <code>GA4_PROPERTY_ID</code>, <code>GA4_CLIENT_EMAIL</code> ve <code>GA4_PRIVATE_KEY</code> değerlerini çevre değişkenlerinize ekleyiniz.
                            </Alert>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Users */}
                        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <UsersSolid className="text-ui-fg-muted w-6 h-6" />
                                <Badge color="blue">Son 7 Gün</Badge>
                            </div>
                            <Text className="text-3xl font-bold">{data.stats.activeUsers.toLocaleString("tr-TR")}</Text>
                            <Text className="text-ui-fg-muted text-sm">Aktif Kullanıcılar</Text>
                        </div>

                        {/* Sessions */}
                        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <DocumentText className="text-ui-fg-muted w-6 h-6" />
                                <Badge color="blue">Son 7 Gün</Badge>
                            </div>
                            <Text className="text-3xl font-bold">{data.stats.sessions.toLocaleString("tr-TR")}</Text>
                            <Text className="text-ui-fg-muted text-sm">Toplam Oturum</Text>
                        </div>

                        {/* Views */}
                        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Eye className="text-ui-fg-muted w-6 h-6" />
                                <Badge color="blue">Son 7 Gün</Badge>
                            </div>
                            <Text className="text-3xl font-bold">{data.stats.screenPageViews.toLocaleString("tr-TR")}</Text>
                            <Text className="text-ui-fg-muted text-sm">Sayfa Görüntüleme</Text>
                        </div>

                        {/* Bounce Rate */}
                        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <ExclamationCircleSolid className="text-ui-fg-muted w-6 h-6" />
                                <Badge color="blue">Son 7 Gün</Badge>
                            </div>
                            <Text className="text-3xl font-bold">{(data.stats.bounceRate * 100).toFixed(1)}%</Text>
                            <Text className="text-ui-fg-muted text-sm">Hemen Çıkma Oranı</Text>
                        </div>
                    </div>

                    {/* Top Pages Table */}
                    <div className="mt-8">
                        <Heading level="h2" className="mb-4">En Çok Ziyaret Edilen Sayfalar</Heading>
                        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-ui-bg-subtle border-b border-ui-border-base text-ui-fg-muted">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Sayfa Başlığı</th>
                                        <th className="px-6 py-4 font-semibold">URL Yolu</th>
                                        <th className="px-6 py-4 font-semibold text-right">Görüntüleme</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border-base">
                                    {data.topPages.map((page, idx) => (
                                        <tr key={idx} className="hover:bg-ui-bg-subtle transition-colors">
                                            <td className="px-6 py-4 font-medium text-ui-fg-base">
                                                {page.pageTitle}
                                            </td>
                                            <td className="px-6 py-4 text-ui-fg-muted">
                                                {page.pagePath}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold">
                                                {page.views.toLocaleString("tr-TR")}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.topPages.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-ui-fg-muted">
                                                Veri bulunamadı.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6">
                    <Text className="text-ui-fg-muted">Analitik verisi alınamadı.</Text>
                </div>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Akıllı Analitik",
    icon: ChartBar,
})

export default AnalyticsPage
