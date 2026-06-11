// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, toast } from "@medusajs/ui"
import { BuildingStorefront } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

/**
 * "Mağazalarım" — çoklu mağaza genel bakış.
 * Her satış kanalı (sales channel) bir mağazadır. Operatör buradan:
 *  - hangi mağazada kaç ürün var görür,
 *  - tek tıkla o mağazanın ürünlerine (filtrelenmiş) gider,
 *  - yeni ürün eklerken doğru satış kanalını seçme hatırlatması alır.
 * Not: Medusa tek admin'dir; mağaza ayrımı satış kanalı iledir (resmi yaklaşım).
 */
const StoresPage = () => {
    const navigate = useNavigate()
    const [channels, setChannels] = useState<any[]>([])
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/admin/sales-channels?limit=50", { credentials: "include" })
                const data = await res.json()
                const list = data.sales_channels || []
                setChannels(list)
                // Her kanal için ürün sayısı
                const c: Record<string, number> = {}
                await Promise.all(list.map(async (ch: any) => {
                    try {
                        const r = await fetch(`/admin/products?sales_channel_id[]=${ch.id}&limit=1`, { credentials: "include" })
                        const d = await r.json()
                        c[ch.id] = d.count ?? 0
                    } catch { c[ch.id] = 0 }
                }))
                setCounts(c)
            } catch (e) {
                toast.error("Mağazalar (satış kanalları) yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return <Container className="p-8"><Text>Yükleniyor...</Text></Container>

    return (
        <Container className="p-0">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-ui-border-base">
                <BuildingStorefront className="text-ui-fg-subtle" />
                <Heading level="h1">Mağazalarım</Heading>
            </div>

            <div className="px-6 py-4">
                <div className="mb-5 rounded-lg p-4 bg-ui-bg-subtle border border-ui-border-base">
                    <Text className="text-ui-fg-base font-medium mb-1">Çoklu mağaza nasıl çalışır?</Text>
                    <Text className="text-ui-fg-subtle text-sm">
                        Her mağaza bir <strong>Satış Kanalı</strong>dır. Bir mağazanın ürünlerini görmek/düzenlemek için
                        aşağıdan o mağazaya tıkla. <strong>Yeni ürün eklerken</strong> ürünün "Satış Kanalları" bölümünden
                        doğru mağazayı seçmeyi unutma — ürün yalnızca seçtiğin mağazanın sitesinde görünür.
                    </Text>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.map((ch) => {
                        const isVape = /vozol|vape/i.test(ch.name || "")
                        return (
                            <div key={ch.id} className="flex flex-col gap-3 p-5 border rounded-xl border-ui-border-base">
                                <div className="flex items-center justify-between">
                                    <Heading level="h2" className="text-base">{ch.name}</Heading>
                                    <Badge color={isVape ? "purple" : "blue"}>{isVape ? "Vape" : "Mağaza"}</Badge>
                                </div>
                                {ch.description && <Text className="text-ui-fg-subtle text-sm">{ch.description}</Text>}
                                <Text className="text-ui-fg-subtle text-sm">
                                    Ürün sayısı: <strong className="text-ui-fg-base">{counts[ch.id] ?? 0}</strong>
                                </Text>
                                <div className="mt-1">
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate(`/products?sales_channel_id[]=${ch.id}`)}
                                    >
                                        Bu mağazanın ürünlerini yönet →
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-6">
                    <Button variant="primary" onClick={() => navigate("/products?create=true")}>
                        + Yeni Ürün Ekle
                    </Button>
                    <Text className="text-ui-fg-subtle text-xs mt-2">
                        Yeni ürün ekranında "Satış Kanalları" bölümünden doğru mağazayı seç.
                    </Text>
                </div>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Mağazalarım",
    icon: BuildingStorefront,
})

export default StoresPage
