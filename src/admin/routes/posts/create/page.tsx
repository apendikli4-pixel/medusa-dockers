import { Container, Heading, Input, Textarea, Button, Label, toast, Badge } from "@medusajs/ui"
import { useState, useEffect, ChangeEvent, FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, ArrowPath } from "@medusajs/icons"
import { CreatePostInput } from "../../../../types"

const CreatePostPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    // Çoklu mağaza: yazı hangi mağazaya ait olacak?
    const [tenants, setTenants] = useState<any[]>([])

    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
        image: "" as string,
        metadata: "{}",
        status: "published" as "draft" | "published",
        author: "",
        excerpt: "",
        seo_title: "",
        seo_description: "",
        tenant_id: "",
    })

    // Mağaza listesini çek (varsayılanı seçili yap).
    useEffect(() => {
        fetch("/admin/tenants", { credentials: "include" })
            .then(r => r.json())
            .then(d => {
                const list = d.tenants || []
                setTenants(list)
                const def = list.find((t: any) => t.slug === "default") || list[0]
                if (def) setFormData(prev => ({ ...prev, tenant_id: def.id }))
            })
            .catch(() => { /* tek mağaza modu */ })
    }, [])

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // =========================================================================
    // 🧠 SYSTEM 2: SERVER-SIDE PROXY (CORS RESILIENT)
    // =========================================================================
    const handleAIGenerate = async () => {
        if (!formData.title) {
            toast.error("Lütfen önce bir başlık girin!")
            return
        }

        setAiLoading(true)
        toast.info("Yapay Zeka düşünüyor... (Server Proxy Mode)")

        try {
            // Çoklu mağaza: içerik SEÇİLİ mağazanın kimliği/sektörüyle üretilir.
            // Yazar kimliği config'ten (settings.storefront.ai.contentPersona); yoksa nötr editör.
            const t = tenants.find(x => x.id === formData.tenant_id)
            const persona =
                t?.settings?.storefront?.ai?.contentPersona ||
                "Sen profesyonel, dürüst ve ilkeli bir e-ticaret içerik editörüsün."
            const storeContext = t
                ? `MAĞAZA BAĞLAMI: Bu yazı "${t.name}" mağazasının blogu içindir (sektör: ${t.sector || "genel"}). İçeriği bu mağazanın sektörüne ve müşterisine uygun yaz; mağazanın satmadığı ürün kategorilerinden bahsetme.`
                : ""

            const proxyRes = await fetch("/admin/generate-content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `
                        ${persona}
                        Konu: "${formData.title}"
                        ${storeContext}

                        GÖREV: Bu konu hakkında Türkçe, SEO uyumlu, HTML formatında (p, h2, ul kullanarak) etkileyici bir blog yazısı hazırla.

                        KRİTİK KURALLAR:
                        1. DOĞRULUK İLKESİ: Genel konularda ansiklopedik doğru bilgi kullan.
                        2. HALLUCINATION GUARD: Bilinmeyen kişiler/markalar hakkında asla hikaye uydurma.
                        
                        İSTENEN ÇIKTILER:
                        - HTML içeriği (content)
                        - URL dostu slug
                        - Unsplash'ten 'image' URL'i
                        - Teknik 'metadata'
                        
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

            if (!proxyRes.ok) {
                const errData = await proxyRes.json()
                throw new Error(errData.details || "Sunucu hatası: " + proxyRes.statusText)
            }

            const data = await proxyRes.json()
            const aiData = JSON.parse(data.result)

            setFormData(prev => ({
                ...prev,
                content: aiData.content,
                slug: aiData.slug || prev.slug,
                image: aiData.image || "",
                metadata: JSON.stringify(aiData.metadata || {}, null, 2)
            }))

            toast.success("İçerik Başarıyla Üretildi! 🚀")

        } catch (error: any) {
            console.error("AI Hatası:", error)
            toast.error("AI Üretimi Başarısız: " + error.message)
        } finally {
            setAiLoading(false)
        }
    }

    const handleSubmit = async (e: FormEvent | null, explicitStatus?: "draft" | "published") => {
        if (e) e.preventDefault()
        setLoading(true)

        const finalStatus = explicitStatus || formData.status

        try {
            // Metadata JSON validasyonu
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

            const res = await fetch("/admin/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                toast.success(finalStatus === "published" ? "Blog yazısı başarıyla yayınlandı! 🎉" : "Blog yazısı taslak olarak kaydedildi! 💾")
                navigate("/posts")
            } else {
                const errorData = await res.json()
                toast.error("Hata: " + (errorData.message || "Bilinmeyen bir hata oluştu"))
            }
        } catch (err) {
            toast.error("Bağlantı hatası.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                {/* @ts-ignore */}
                <Heading level="h1">Yeni Blog Yazısı</Heading>
                <Badge color="blue">Yapay Zeka Destekli 🧠</Badge>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* TITLE & SLUG SECTION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Başlık (Konu)</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Örn: iPhone 16 İncelemesi"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="slug">Slug (URL)</Label>
                        <Input
                            id="slug"
                            name="slug"
                            placeholder="otomatik-olusturulur"
                            value={formData.slug}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

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

                {/* IMAGE URL */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="image">Kapak Görseli (URL)</Label>
                    <Input
                        id="image"
                        name="image"
                        placeholder="https://..."
                        value={formData.image}
                        onChange={handleChange}
                    />
                </div>

                {/* AI ACTION BUTTON */}
                <div className="flex justify-end p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base items-center gap-4">
                    <span className="text-ui-fg-subtle text-sm">
                        Başlığı girdikten sonra yapay zekayı ateşleyin 👉
                    </span>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleAIGenerate}
                        isLoading={aiLoading}
                        disabled={!formData.title || aiLoading}
                    >
                        {aiLoading ? <ArrowPath className="animate-spin" /> : <Sparkles />}
                        Yapay Zeka ile Üret ve Zenginleştir
                    </Button>
                </div>

                {/* CONTENT EDITOR */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="content">İçerik (HTML)</Label>
                    <Textarea
                        id="content"
                        name="content"
                        placeholder="Yazı içeriği buraya..."
                        rows={15}
                        value={formData.content}
                        onChange={handleChange}
                        required
                        className="font-mono text-sm"
                    />
                </div>

                {/* SEO SECTION */}
                <div className="bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
                    {/* @ts-ignore */}
                    <Heading level="h2" className="text-ui-fg-base mb-4">🔍 SEO Ayarları</Heading>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="author">Yazar</Label>
                            <Input
                                id="author"
                                name="author"
                                placeholder="Mustafa Gürçüler"
                                value={formData.author}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="seo_title">SEO Başlığı</Label>
                            <Input
                                id="seo_title"
                                name="seo_title"
                                placeholder="Arama motorlarında görünecek başlık"
                                value={formData.seo_title}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                        <Label htmlFor="excerpt">Kısa Özet</Label>
                        <Textarea
                            id="excerpt"
                            name="excerpt"
                            placeholder="Yazının kısa özeti (liste sayfasında gösterilir)"
                            rows={2}
                            value={formData.excerpt}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="seo_description">SEO Açıklaması</Label>
                        <Textarea
                            id="seo_description"
                            name="seo_description"
                            placeholder="Meta description (max 160 karakter önerilir)"
                            rows={2}
                            value={formData.seo_description}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* METADATA EDITOR */}
                <div className="flex flex-col gap-2">
                    <Label htmlFor="metadata">Teknik Özellikler (JSON)</Label>
                    <Textarea
                        id="metadata"
                        name="metadata"
                        placeholder='{"key": "value"}'
                        rows={5}
                        value={formData.metadata}
                        onChange={handleChange}
                        className="font-mono text-sm"
                    />
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button variant="secondary" onClick={() => navigate("/posts")} type="button">
                        İptal
                    </Button>
                    <Button variant="secondary" onClick={() => handleSubmit(null, "draft")} isLoading={loading} type="button">
                        Taslak Olarak Kaydet 💾
                    </Button>
                    <Button type="button" onClick={() => handleSubmit(null, "published")} isLoading={loading}>
                        Yayınla 🚀
                    </Button>
                </div>
            </form>
        </Container>
    )
}

export default CreatePostPage
