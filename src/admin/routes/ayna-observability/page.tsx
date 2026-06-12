import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Table, Badge, Button, Toaster, toast } from "@medusajs/ui"
import { ShieldCheck, ArrowPath } from "@medusajs/icons"
import { useState, useEffect } from "react"

const ObservabilityDashboard = () => {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const res = await fetch("/admin/conscience/logs?limit=50", { credentials: "include" })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setLogs(data.logs || [])
        } catch (error: any) {
            toast.error("Hata", {
                description: `Loglar yüklenirken hata oluştu: ${error.message}`
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const getLevelBadge = (level: string) => {
        switch (level) {
            case "critical":
                return <Badge color="red">DENY / CRITICAL</Badge>
            case "warning":
                return <Badge color="orange">WARNING</Badge>
            case "info":
                return <Badge color="green">ALLOW / INFO</Badge>
            default:
                return <Badge>{level}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    }

    return (
        <Container className="p-0 border-none bg-transparent">
            <Toaster />
            {/* Header */}
            <div className="p-8 mb-6 bg-ui-bg-base border rounded-xl shadow-sm">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-sm">
                            <ShieldCheck className="text-emerald-500 w-8 h-8 drop-shadow-sm" />
                        </div>
                        <div>
                            <Heading level="h1" className="text-2xl font-bold tracking-tight">Ayna Gözlem Ekranı (Observability)</Heading>
                            <Text className="text-ui-fg-muted mt-1 font-medium italic">
                                Yapay zekanın aldığı etik kararlar, prompt injection engellemeleri ve bütçe uyarıları.
                            </Text>
                        </div>
                    </div>
                    <div>
                        <Button variant="secondary" onClick={fetchLogs} disabled={loading} className="gap-2">
                            <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Yenile
                        </Button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-ui-bg-base border rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Tarih</Table.HeaderCell>
                            <Table.HeaderCell>Müşteri ID</Table.HeaderCell>
                            <Table.HeaderCell>Karar Seviyesi</Table.HeaderCell>
                            <Table.HeaderCell>Açıklama (Message)</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {loading && logs.length === 0 ? (
                            <Table.Row>
                                <td colSpan={4} className="text-center py-8 text-ui-fg-muted">
                                    Loglar yükleniyor...
                                </td>
                            </Table.Row>
                        ) : logs.length === 0 ? (
                            <Table.Row>
                                <td colSpan={4} className="text-center py-8 text-ui-fg-muted">
                                    Henüz kaydedilmiş bir karar logu bulunmuyor.
                                </td>
                            </Table.Row>
                        ) : (
                            logs.map((log) => (
                                <Table.Row key={log.id}>
                                    <Table.Cell className="whitespace-nowrap font-medium text-ui-fg-subtle">
                                        {formatDate(log.created_at)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge size="small" color="grey">{log.customer_id === "system" ? "Sistem" : log.customer_id}</Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {getLevelBadge(log.level)}
                                    </Table.Cell>
                                    <Table.Cell className="max-w-md whitespace-pre-wrap">
                                        {log.message}
                                    </Table.Cell>
                                </Table.Row>
                            ))
                        )}
                    </Table.Body>
                </Table>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Ayna Gözlem",
    icon: ShieldCheck,
})

export default ObservabilityDashboard
