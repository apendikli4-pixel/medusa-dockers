// @ts-nocheck
/**
 * @sealed 2026-03-09
 * @status NEW
 * @warning Genesis Protocol - Medusa v2 Admin UI standardı
 */
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Text } from "@medusajs/ui"
import { ChartBar, CheckCircleSolid, XMark, Sparkles } from "@medusajs/icons"
import { useEffect, useState } from "react"

type HealthStats = {
    total_events: number
    last_24h_events: number
    error_count: number
    success_rate: number
    last_event: string | null
    recent_events?: {
        id: string
        created_at: string
        actor: string
        action: string
        content: string
    }[]
}

const SystemHealthPage = () => {
    const [stats, setStats] = useState<HealthStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/admin/system-health/stats", {
                    credentials: "include"
                })
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (e) {
                console.error("Failed to fetch health stats", e)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    return (
        <Container className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-rose-500 w-8 h-8" />
                <Heading level="h1">Sistem Sağlığı (Observability)</Heading>
            </div>

            {loading ? (
                <Text className="text-ui-fg-muted">Yükleniyor...</Text>
            ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Events */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <ChartBar className="text-ui-fg-muted w-6 h-6" />
                            <Badge color="grey">Toplam</Badge>
                        </div>
                        <Text className="text-3xl font-bold">{stats.total_events}</Text>
                        <Text className="text-ui-fg-muted text-sm">Toplam Kayıt</Text>
                    </div>

                    {/* Last 24h */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <ChartBar className="text-blue-500 w-6 h-6" />
                            <Badge color="blue">24 Saat</Badge>
                        </div>
                        <Text className="text-3xl font-bold">{stats.last_24h_events}</Text>
                        <Text className="text-ui-fg-muted text-sm">Son 24 Saat</Text>
                    </div>

                    {/* Error Count */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <XMark className="text-rose-500 w-6 h-6" />
                            <Badge color="red">Hata</Badge>
                        </div>
                        <Text className="text-3xl font-bold">{stats.error_count}</Text>
                        <Text className="text-ui-fg-muted text-sm">Hata Sayısı</Text>
                    </div>

                    {/* Success Rate */}
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <CheckCircleSolid className="text-emerald-500 w-6 h-6" />
                            <Badge color="green">Başarı</Badge>
                        </div>
                        <Text className="text-3xl font-bold">{stats.success_rate}%</Text>
                        <Text className="text-ui-fg-muted text-sm">Başarı Oranı</Text>
                    </div>
                </div>
            ) : (
                <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6">
                    <Text className="text-ui-fg-muted">
                        Henüz veri yok. Sistem etkinlikleri memory_truth tablosuna kaydedildikçe burada görünecek.
                    </Text>
                </div>
            )}

            {/* Recent Events Table */}
            {stats?.recent_events && stats.recent_events.length > 0 && (
                <div className="mt-8">
                    <Heading level="h2" className="mb-4">Son Aktiviteler (Son 15 İşlem)</Heading>
                    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-ui-bg-subtle border-b border-ui-border-base text-ui-fg-muted">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tarih</th>
                                    <th className="px-6 py-4 font-semibold">Aktör</th>
                                    <th className="px-6 py-4 font-semibold">Eylem</th>
                                    <th className="px-6 py-4 font-semibold w-full">Detay (İçerik)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ui-border-base">
                                {stats.recent_events.map((event) => (
                                    <tr key={event.id} className="hover:bg-ui-bg-subtle transition-colors">
                                        <td className="px-6 py-4 text-ui-fg-muted">
                                            {new Date(event.created_at).toLocaleString("tr-TR")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color={event.actor === "system" ? "purple" : event.actor === "ayna" ? "blue" : "grey"}>
                                                {event.actor}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge color={event.action.includes("error") ? "red" : "green"}>
                                                {event.action}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 truncate max-w-[400px]" title={event.content}>
                                            <Text className="truncate text-ui-fg-base">{event.content}</Text>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Sistem Sağlığı",
    icon: Sparkles,
})

export default SystemHealthPage
