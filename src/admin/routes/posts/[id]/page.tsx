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

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
        image: "",
        metadata: "{}",
        status: "published",
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
                    status: post.status || "published"
                })
                setPageLoading(false)
            })
            .catch(err => {
                console.error(err)
                toast.error("Yazı yüklenirken hata oluştu.")
                setPageLoading(false)
            })
    }, [id])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
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

                {/* IMAGE */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="image">Kapak Görseli (URL)</Label>
                    <Input id="image" name="image" value={formData.image} onChange={handleChange} />
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
                    <Label htmlFor="content">İçerik (HTML)</Label>
                    <Textarea id="content" name="content" rows={15} value={formData.content} onChange={handleChange} required className="font-mono text-sm" />
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
