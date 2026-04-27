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

            {/* Last Event Info */}
            {stats?.last_event && (
                <div className="mt-8 bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6">
                    <Text className="text-sm text-ui-fg-muted mb-2">Son Aktivite</Text>
                    <Text className="text-ui-fg-base">{stats.last_event}</Text>
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
