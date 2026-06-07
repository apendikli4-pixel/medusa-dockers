// @ts-nocheck
import { Container, Heading, Input, Textarea, Button, Label, Badge, toast } from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

const EditPagePage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [form, setForm] = useState({
        title: "", slug: "", content: "",
        seo_title: "", seo_description: "", status: "draft",
    })

    useEffect(() => {
        if (!id) return
        fetch(`/admin/pages/${id}`, { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                const p = d.page
                setForm({
                    title: p.title || "", slug: p.slug || "", content: p.content || "",
                    seo_title: p.seo_title || "", seo_description: p.seo_description || "",
                    status: p.status || "draft",
                })
                setPageLoading(false)
            })
            .catch(() => { toast.error("Sayfa yüklenirken hata oluştu."); setPageLoading(false) })
    }, [id])

    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const save = async (explicitStatus) => {
        setLoading(true)
        const status = explicitStatus || form.status
        try {
            const res = await fetch(`/admin/pages/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...form, status }),
            })
            if (res.ok) {
                toast.success(status === "published" ? "Sayfa yayınlandı! 🎉" : "Sayfa kaydedildi 💾")
                setForm(prev => ({ ...prev, status }))
            } else {
                const e = await res.json().catch(() => ({}))
                toast.error("Hata: " + (e.error || "Kaydedilemedi"))
            }
        } catch { toast.error("Bağlantı hatası.") } finally { setLoading(false) }
    }

    const remove = async () => {
        if (!confirm("Bu sayfayı silmek istediğinize emin misiniz?")) return
        try {
            const res = await fetch(`/admin/pages/${id}`, { method: "DELETE", credentials: "include" })
            if (res.ok) { toast.success("Sayfa silindi."); navigate("/pages") }
            else toast.error("Silme hatası.")
        } catch { toast.error("Bağlantı hatası.") }
    }

    if (pageLoading) return <Container className="p-8"><span>Yükleniyor...</span></Container>

    return (
        <Container className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <Heading level="h1">Sayfayı Düzenle</Heading>
                <div className="flex items-center gap-2">
                    <Badge color={form.status === "published" ? "green" : "grey"}>
                        {form.status === "published" ? "Yayınlanmış" : "Taslak"}
                    </Badge>
                    <Button variant="secondary" onClick={() => save("draft")} isLoading={loading}>Taslak Kaydet</Button>
                    <Button variant="primary" onClick={() => save("published")} isLoading={loading}>Yayınla / Güncelle 🚀</Button>
                    <Button variant="danger" onClick={remove}><Trash /></Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>Başlık</Label>
                    <Input name="title" value={form.title} onChange={change} placeholder="Hakkımızda" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Slug (URL: /pages/...)</Label>
                    <Input name="slug" value={form.slug} onChange={change} placeholder="hakkimizda" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Label>İçerik (HTML veya düz metin)</Label>
                <Textarea name="content" value={form.content} onChange={change} rows={16} placeholder="<h2>Hakkımızda</h2><p>...</p>" />
                <span className="text-ui-fg-subtle text-xs">İpucu: Başlık için &lt;h2&gt;, paragraf için &lt;p&gt; kullanabilirsiniz. Düz yazı da olur.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>SEO Başlık (opsiyonel)</Label>
                    <Input name="seo_title" value={form.seo_title} onChange={change} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>SEO Açıklama (opsiyonel)</Label>
                    <Input name="seo_description" value={form.seo_description} onChange={change} />
                </div>
            </div>

            <div>
                <a
                    href={`https://ayna.141.98.48.155.sslip.io/tr/pages/${form.slug}`}
                    target="_blank" rel="noreferrer"
                    className="text-ui-fg-interactive text-sm underline"
                >
                    Yayındaki sayfayı görüntüle →
                </a>
            </div>
        </Container>
    )
}

export default EditPagePage
