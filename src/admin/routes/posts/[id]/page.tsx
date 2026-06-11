// @ts-nocheck
import { Container, Heading, Input, Textarea, Button, Label, toast, Badge } from "@medusajs/ui"
import React, { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Sparkles, ArrowPath, Trash } from "@medusajs/icons"
import { Post } from "../../../../types/content-engine"

const EditPostPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [aiLoading, setAiLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    // Çoklu mağaza: yazı hangi mağazaya ait?
    const [tenants, setTenants] = useState([])

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
        image: "",
        metadata: "{}",
        status: "published",
        tenant_id: "",
    })

    useEffect(() => {
        if (!id) return

        fetch(`/admin/posts/${id}`)
            .then(res => res.json())
            .then((data: any) => {
                const post = data.post as Post
                setFormData({
                    title: post.title || "",
                    slug: post.slug || "",
                    content: post.content || "",
                    image: post.image || "",
                    metadata: JSON.stringify(post.metadata || {}, null, 2),
                    status: post.status || "published",
                    tenant_id: (post as any).tenant_id || "",
                })
                setPageLoading(false)
            })
            .catch(err => {
                console.error(err)
                toast.error("Yazı yüklenirken hata oluştu.")
                setPageLoading(false)
            })
    }, [id])

    // Mağaza listesini çek.
    useEffect(() => {
        fetch("/admin/tenants", { credentials: "include" })
            .then(r => r.json())
            .then(d => setTenants(d.tenants || []))
            .catch(() => { /* tek mağaza modu */ })
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // Sisteme dosya (görsel) yükle → /admin/uploads → dönen URL'i image alanına yaz.
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("Lütfen bir görsel dosyası seçin.")
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append("files", file)
            const res = await fetch("/admin/uploads", { method: "POST", body: fd, credentials: "include" })
            if (!res.ok) throw new Error(`Yükleme başarısız (${res.status})`)
            const data = await res.json()
            const url = data?.files?.[0]?.url || data?.uploads?.[0]?.url
            if (!url) throw new Error("Sunucudan görsel adresi alınamadı")
            setFormData(prev => ({ ...prev, image: url }))
            toast.success("Görsel yüklendi! 🖼️")
        } catch (err: any) {
            toast.error("Görsel yüklenemedi: " + (err?.message || "bilinmeyen hata"))
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }

    // İÇERİĞE görsel ekle: yükle → dönen URL'i <img> olarak içeriğin sonuna ekle.
    const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("Lütfen bir görsel dosyası seçin.")
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append("files", file)
            const res = await fetch("/admin/uploads", { method: "POST", body: fd, credentials: "include" })
            if (!res.ok) throw new Error(`Yükleme başarısız (${res.status})`)
            const data = await res.json()
            const url = data?.files?.[0]?.url || data?.uploads?.[0]?.url
            if (!url) throw new Error("Sunucudan görsel adresi alınamadı")
            const imgTag = `\n<img src="${url}" alt="" style="max-width:100%;border-radius:12px;margin:16px 0;" />\n`
            setFormData(prev => ({ ...prev, content: (prev.content || "") + imgTag }))
            toast.success("Görsel içeriğe eklendi! 🖼️ (İçerik sonuna eklendi, istediğin yere taşıyabilirsin.)")
        } catch (err: any) {
            toast.error("Görsel eklenemedi: " + (err?.message || "bilinmeyen hata"))
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }

    const handleAIGenerate = async () => {
        if (!formData.title) {
            toast.error("Lütfen önce bir başlık girin!")
            return
        }

        setAiLoading(true)
        toast.info("Yapay Zeka içeriği geliştiriyor... (Server Proxy Mode)")

        try {
            const proxyRes = await fetch("/admin/generate-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `
                        Sen profesyonel bir blog yazarısın. 
                        Mevcut İçeriği Geliştir / Yeniden Yaz.
                        Konu: "${formData.title}"
                        
                        Lütfen bu konuda Türkçe, SEO uyumlu, HTML formatında (p, h2, ul kullanarak) bir blog yazısı hazırla.
                        Ayrıca bu başlık için URL dostu bir 'slug', konuyla ilgili temsili bir 'image' (Unsplash URL) ve teknik özellikler içeren bir 'metadata' hazırla.
                        
                        YANIT FORMATI (SADECE JSON):
                        {
                            "content": "<html içeriği>",
                            "slug": "url-slug-onerisi",
                            "image": "https://images.unsplash.com/photo-...",
                            "metadata": {
                                "ozellik_1": "deger",
                                "ozellik_2": "deger"
                            }
                        }
                    `
                })
            })

            if (!proxyRes.ok) throw new Error("AI Hatası")

            const data = await proxyRes.json()
            const aiData = JSON.parse(data.result)

            setFormData(prev => ({
                ...prev,
                content: aiData.content,
                slug: aiData.slug || prev.slug,
                image: aiData.image || prev.image,
                metadata: JSON.stringify(aiData.metadata || {}, null, 2)
            }))

            toast.success("İçerik Geliştirildi! 🚀")

        } catch (error: any) {
            toast.error("AI Hatası: " + error.message)
        } finally {
            setAiLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent, explicitStatus?: string) => {
        if (e) e.preventDefault()
        setLoading(true)

        const finalStatus = explicitStatus || formData.status

        try {
            let parsedMetadata = {}
            try {
                parsedMetadata = JSON.parse(formData.metadata)
            } catch (e) {
                toast.error("Metadata geçerli bir JSON değil!")
                setLoading(false)
                return
            }

            const payload = {
                ...formData,
                status: finalStatus,
                metadata: parsedMetadata
            }

            const res = await fetch(`/admin/posts/${id}`, {
                method: "POST", // UPDATE implementation
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success("Blog yazısı güncellendi! 🎉")
                setFormData(prev => ({ ...prev, status: finalStatus }))
            } else {
                const errorData = await res.json()
                toast.error("Hata: " + (errorData.message || "Güncelleme başarısız"))
            }
        } catch (err) {
            toast.error("Bağlantı hatası.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Bu yazıyı silmek istediğinize emin misiniz?")) return

        try {
            const res = await fetch(`/admin/posts/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Yazı silindi.")
                navigate("/posts")
            } else {
                toast.error("Silme hatası.")
            }
        } catch (e) {
            toast.error("Bağlantı hatası.")
        }
    }

    if (pageLoading) return <Container className="p-8">Yükleniyor...</Container>

    return (
        <Container className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <Heading level="h1">Yazıyı Düzenle</Heading>
                <div className="flex gap-2 items-center">
                    <Badge color={formData.status === "published" ? "green" : "grey"}>
                        {formData.status === "published" ? "Yayınlanmış" : "Taslak"}
                    </Badge>
                    <Badge color="blue">Yapay Zeka Destekli 🧠</Badge>
                    <Button variant="danger" onClick={handleDelete}>
                        <Trash /> Sil
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* STORE (TENANT) SELECTOR — çoklu mağaza */}
                {tenants.length > 1 && (
                    <div className="flex flex-col gap-2 max-w-md">
                        <Label htmlFor="tenant_id">Mağaza (bu yazı hangi mağazada görünecek?)</Label>
                        <select
                            id="tenant_id"
                            name="tenant_id"
                            className="h-9 rounded-md border border-ui-border-base bg-ui-bg-field px-2 text-sm text-ui-fg-base"
                            value={formData.tenant_id}
                            onChange={handleChange}
                        >
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* TITLE & SLUG */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Başlık</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="slug">Slug</Label>
                        <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required />
                    </div>
                </div>

                {/* IMAGE — URL yapıştır VEYA sisteme dosya yükle */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="image">Kapak Görseli</Label>
                    <div className="flex gap-2 items-center">
                        <Input
                            id="image"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="Görsel URL'i yapıştırın veya sağdan dosya yükleyin"
                        />
                        <label
                            className="shrink-0 cursor-pointer px-4 py-2 rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-base-hover text-sm font-medium whitespace-nowrap transition-colors"
                            title="Bilgisayarından görsel yükle"
                        >
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            {uploading ? "Yükleniyor..." : "📤 Dosya Yükle"}
                        </label>
                    </div>
                    {formData.image && (
                        <img
                            src={formData.image}
                            alt="Kapak önizleme"
                            style={{ maxHeight: 140, borderRadius: 8, marginTop: 8, objectFit: "cover", border: "1px solid var(--border-base, #e5e7eb)" }}
                        />
                    )}
                </div>

                {/* AI BUTTON */}
                <div className="flex justify-end p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base items-center gap-4">
                    <span className="text-ui-fg-subtle text-sm">Yapay Zeka ile içeriği tekrar harmanla 👉</span>
                    <Button type="button" variant="primary" onClick={handleAIGenerate} isLoading={aiLoading} disabled={!formData.title || aiLoading}>
                        {aiLoading ? <ArrowPath className="animate-spin" /> : <Sparkles />}
                        AI ile Düzenle / Zenginleştir
                    </Button>
                </div>

                {/* CONTENT */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="content">İçerik (HTML)</Label>
                        <label className="inline-flex cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} disabled={uploading} />
                            <Button type="button" variant="secondary" size="small" isLoading={uploading} asChild>
                                <span>🖼️ İçeriğe Görsel Ekle</span>
                            </Button>
                        </label>
                    </div>
                    <Textarea id="content" name="content" rows={15} value={formData.content} onChange={handleChange} required className="font-mono text-sm" />
                    <span className="text-ui-fg-subtle text-xs">"İçeriğe Görsel Ekle" yüklediğin görseli içeriğin sonuna ekler; istediğin yere taşıyabilirsin.</span>
                </div>

                {/* METADATA */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="metadata">Teknik Özellikler (JSON)</Label>
                    <Textarea id="metadata" name="metadata" rows={5} value={formData.metadata} onChange={handleChange} className="font-mono text-sm" />
                </div>

                {/* SAVE BUTTON */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="secondary" onClick={() => navigate("/posts")} type="button">İptal</Button>
                    <Button variant="secondary" onClick={() => handleSubmit(null, "draft")} isLoading={loading} type="button">Taslağa Çek 💾</Button>
                    <Button type="button" onClick={() => handleSubmit(null, "published")} isLoading={loading}>Yayınla / Güncelle 🚀</Button>
                </div>
            </form>
        </Container>
    )
}

export default EditPostPage
