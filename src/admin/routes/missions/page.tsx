// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Button, Text, Tooltip, toast } from "@medusajs/ui"
import { Sparkles, InformationCircle } from "@medusajs/icons"
import { useEffect, useState } from "react"

type Mission = {
    id: string
    title: string
    description: string | null
    status: "pending" | "in_progress" | "completed" | "failed"
    priority: "low" | "medium" | "high" | "critical"
    created_at: string
    result: any
}

const MissionsPage = () => {
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    const fetchMissions = async () => {
        setLoading(true)
        try {
            const res = await fetch("/admin/missions", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setMissions(data.missions)
            }
        } catch (e) {
            console.error("Failed to fetch missions", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMissions()
    }, [])

    const handleMissionAction = async (missionId: string, status: "completed" | "failed") => {
        setProcessing(missionId)
        try {
            const res = await fetch("/admin/missions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ missionId, status }),
                credentials: "include"
            })
            const data = await res.json()
            if (res.ok) {
                toast.success(status === "completed" ? "Görev başarıyla yürütüldü." : "Görev reddedildi.")
                fetchMissions()
            } else {
                toast.error(data.error || "İşlem sırasında bir hata oluştu.")
            }
        } catch (e) {
            console.error("Failed to update mission", e)
            toast.error("Sunucuya bağlanılamadı.")
        } finally {
            setProcessing(null)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed": return <Badge color="green">Tamamlandı</Badge>
            case "pending": return <Badge color="orange">Beklemede</Badge>
            case "in_progress": return <Badge color="blue">İşleniyor</Badge>
            case "failed": return <Badge color="red">Hata</Badge>
            default: return <Badge color="grey">{status}</Badge>
        }
    }

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "critical": return <Badge color="red">Kritik</Badge>
            case "high": return <Badge color="orange">Yüksek</Badge>
            case "medium": return <Badge color="blue">Orta</Badge>
            default: return <Badge color="grey">Düşük</Badge>
        }
    }

    return (
        <Container className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-blue-500 w-8 h-8" />
                    <Heading level="h1">AI Görev Paneli</Heading>
                </div>
                <Button variant="secondary" onClick={fetchMissions} disabled={loading}>
                    Yenile
                </Button>
            </div>

            <Text className="text-ui-fg-muted mb-6">
                Ayna AI tarafından oluşturulan ve onay bekleyen görevleri buradan yönetebilirsiniz.
            </Text>

            {loading ? (
                <Text>Yükleniyor...</Text>
            ) : missions.length === 0 ? (
                <Text className="text-ui-fg-muted">Bekleyen görev bulunmuyor.</Text>
            ) : (
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Görev Başlığı</Table.HeaderCell>
                            <Table.HeaderCell>Durum</Table.HeaderCell>
                            <Table.HeaderCell>Öncelik</Table.HeaderCell>
                            <Table.HeaderCell>Oluşturma</Table.HeaderCell>
                            <Table.HeaderCell>Detay</Table.HeaderCell>
                            <Table.HeaderCell>İşlemler</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {missions.map((mission) => (
                            <Table.Row key={mission.id}>
                                <Table.Cell>
                                    <div className="flex flex-col">
                                        <Text className="font-medium">{mission.title}</Text>
                                        <Text className="text-xs text-ui-fg-muted">{mission.description}</Text>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>{getStatusBadge(mission.status)}</Table.Cell>
                                <Table.Cell>{getPriorityBadge(mission.priority)}</Table.Cell>
                                <Table.Cell>
                                    {new Date(mission.created_at).toLocaleDateString("tr-TR")}
                                </Table.Cell>
                                <Table.Cell>
                                    {mission.result && (
                                        <Tooltip content={JSON.stringify(mission.result, null, 2)}>
                                            <InformationCircle className="text-ui-fg-muted cursor-help" />
                                        </Tooltip>
                                    )}
                                </Table.Cell>
                                <Table.Cell>
                                    {mission.status === "pending" && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="small"
                                                variant="primary"
                                                isLoading={processing === mission.id}
                                                onClick={() => handleMissionAction(mission.id, "completed")}
                                            >
                                                Onayla ve Yürüt
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="danger"
                                                disabled={processing === mission.id}
                                                onClick={() => handleMissionAction(mission.id, "failed")}
                                            >
                                                Reddet
                                            </Button>
                                        </div>
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "AI Görevleri",
    icon: Sparkles,
})

export default MissionsPage
