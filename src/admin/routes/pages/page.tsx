// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Label, Badge, toast } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

/** Türkçe karakterleri sadeleştirip URL-güvenli slug üretir. */
function slugify(s: string): string {
    const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", İ: "i", Ö: "o", Ş: "s", Ü: "u" }
    return s.split("").map(c => map[c] ?? c).join("")
        .toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80)
}

const PagesListPage = () => {
    const navigate = useNavigate()
    const [pages, setPages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    // Çoklu mağaza: yeni sayfa hangi mağazaya ait olacak?
    const [tenants, setTenants] = useState<any[]>([])
    const [selectedTenantId, setSelectedTenantId] = useState<string>("")

    const load = () => {
        setLoading(true)
        fetch("/admin/pages", { credentials: "include" })
            .then(r => r.json())
            .then(d => setPages(d.pages || []))
            .catch(() => toast.error("Sayfalar yüklenemedi"))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    // Mağaza listesini çek (varsayılanı seçili yap).
    useEffect(() => {
        fetch("/admin/tenants", { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                const list = d.tenants || []
                setTenants(list)
                const def = list.find((t: any) => t.slug === "default") || list[0]
                if (def) setSelectedTenantId(def.id)
            })
            .catch(() => { /* tenant modülü yoksa tek mağaza modunda sessizce geç */ })
    }, [])

    const tenantName = (id?: string) => tenants.find(t => t.id === id)?.name || null

    const createPage = async () => {
        if (!newTitle.trim()) { toast.error("Başlık girin"); return }
        setCreating(true)
        try {
            const res = await fetch("/admin/pages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title: newTitle.trim(),
                    slug: slugify(newTitle),
                    content: "",
                    status: "draft",
                    ...(selectedTenantId ? { tenant_id: selectedTenantId } : {}),
                }),
            })
            if (!res.ok) throw new Error()
            const d = await res.json()
            toast.success("Sayfa oluşturuldu, düzenleyebilirsiniz")
            navigate(`/pages/${d.page.id}`)
        } catch {
            toast.error("Sayfa oluşturulamadı (slug benzersiz mi?)")
        } finally { setCreating(false) }
    }

    return (
        <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
                <div className="flex items-center gap-3">
                    <DocumentText className="text-ui-fg-subtle" />
                    <Heading level="h1">Sayfalar</Heading>
                </div>
            </div>

            {/* Yeni sayfa */}
            <div className="flex items-end gap-3 px-6 py-4 border-b border-ui-border-base bg-ui-bg-subtle">
                <div className="flex flex-col gap-1 flex-1 max-w-md">
                    <Label size="small">Yeni Sayfa Başlığı</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Örn: Hakkımızda" />
                </div>
                {tenants.length > 1 && (
                    <div className="flex flex-col gap-1">
                        <Label size="small">Mağaza</Label>
                        <select
                            className="h-8 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm text-ui-fg-base"
                            value={selectedTenantId}
                            onChange={e => setSelectedTenantId(e.target.value)}
                        >
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <Button variant="primary" onClick={createPage} isLoading={creating}>+ Yeni Sayfa</Button>
            </div>

            <div className="px-6 py-4">
                {loading ? (
                    <p className="text-ui-fg-subtle">Yükleniyor...</p>
                ) : pages.length === 0 ? (
                    <p className="text-ui-fg-subtle">Henüz sayfa yok. Yukarıdan "Hakkımızda" gibi bir sayfa oluşturun.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-ui-fg-subtle border-b border-ui-border-base">
                                <th className="py-2">Başlık</th>
                                <th className="py-2">Slug (URL)</th>
                                {tenants.length > 1 && <th className="py-2">Mağaza</th>}
                                <th className="py-2">Durum</th>
                                <th className="py-2 text-right">Görüntülenme</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pages.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b border-ui-border-base hover:bg-ui-bg-base-hover cursor-pointer"
                                    onClick={() => navigate(`/pages/${p.id}`)}
                                >
                                    <td className="py-3 font-medium text-ui-fg-interactive">{p.title}</td>
                                    <td className="py-3 text-ui-fg-subtle">/{p.slug}</td>
                                    {tenants.length > 1 && (
                                        <td className="py-3">
                                            <Badge color="blue">{tenantName(p.tenant_id) || "—"}</Badge>
                                        </td>
                                    )}
                                    <td className="py-3">
                                        <Badge color={p.status === "published" ? "green" : "grey"}>
                                            {p.status === "published" ? "Yayınlanmış" : "Taslak"}
                                        </Badge>
                                    </td>
                                    <td className="py-3 text-right text-ui-fg-subtle">{p.view_count ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Sayfalar",
    icon: DocumentText,
})

export default PagesListPage
