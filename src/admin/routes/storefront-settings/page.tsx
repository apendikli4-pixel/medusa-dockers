import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, toast, Select, Input, Label, Textarea } from "@medusajs/ui"
import { ComputerDesktop } from "@medusajs/icons"
import { useEffect, useState } from "react"

const StorefrontSettingsPage = () => {
    const [tenants, setTenants] = useState<any[]>([])
    const [selectedTenantId, setSelectedTenantId] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form states
    const [contactPerson, setContactPerson] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [contactEmail, setContactEmail] = useState("")
    const [contactAddress, setContactAddress] = useState("")
    
    const [socialIg, setSocialIg] = useState("")
    const [socialFb, setSocialFb] = useState("")
    const [socialX, setSocialX] = useState("")
    const [socialYt, setSocialYt] = useState("")

    const [kurumsalLinks, setKurumsalLinks] = useState("")
    const [musteriLinks, setMusteriLinks] = useState("")
    const [yasalLinks, setYasalLinks] = useState("")

    // Anasayfa hero (üst banner) görseli
    const [heroImage, setHeroImage] = useState("")
    const [uploading, setUploading] = useState(false)

    // ─── StoreConfig: marka, AI, yaş kapısı, e-posta (çoklu mağaza) ───
    const [brandDescription, setBrandDescription] = useState("")
    const [brandKeywords, setBrandKeywords] = useState("") // virgülle ayrılmış
    const [aiGreeting, setAiGreeting] = useState("")
    const [aiChatEnabled, setAiChatEnabled] = useState(true)
    const [whatsappLink, setWhatsappLink] = useState("")
    const [ageGateEnabled, setAgeGateEnabled] = useState(false)
    const [ageGateMessage, setAgeGateMessage] = useState("")
    const [emailSenderName, setEmailSenderName] = useState("")
    const [emailSenderAddress, setEmailSenderAddress] = useState("")
    const [emailIban, setEmailIban] = useState("")

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const res = await fetch("/admin/tenants")
                if (res.ok) {
                    const data = await res.json()
                    setTenants(data.tenants || [])
                    if (data.tenants?.length > 0) {
                        setSelectedTenantId(data.tenants[0].id)
                    }
                }
            } catch (error) {
                console.error(error)
                toast.error("Mağazalar yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchTenants()
    }, [])

    useEffect(() => {
        if (!selectedTenantId) return
        const t = tenants.find(x => x.id === selectedTenantId)
        if (t) {
            const sf = t.settings?.storefront || {}
            setContactPerson(sf.contact?.person || "")
            setContactPhone(sf.contact?.phone || "")
            setContactEmail(sf.contact?.email || "")
            setContactAddress(sf.contact?.address || "")
            
            setSocialIg(sf.socials?.instagram || "")
            setSocialFb(sf.socials?.facebook || "")
            setSocialX(sf.socials?.x || "")
            setSocialYt(sf.socials?.youtube || "")

            setKurumsalLinks(sf.links?.kurumsal || "")
            setMusteriLinks(sf.links?.musteri || "")
            setYasalLinks(sf.links?.yasal || "")
            setHeroImage(sf.heroImage || "")

            // StoreConfig alanları
            setBrandDescription(sf.branding?.description || "")
            setBrandKeywords((sf.branding?.keywords || []).join(", "))
            setAiGreeting(sf.ai?.greeting || "")
            setAiChatEnabled(sf.ai?.chatEnabled !== false)
            setWhatsappLink(sf.ai?.whatsappLink || "")
            setAgeGateEnabled(!!sf.ageGate?.enabled)
            setAgeGateMessage(sf.ageGate?.message || "")
            setEmailSenderName(sf.email?.senderName || "")
            setEmailSenderAddress(sf.email?.senderAddress || "")
            setEmailIban(sf.email?.iban || "")
        }
    }, [selectedTenantId, tenants])

    // Hero görselini sisteme yükle → /admin/uploads → dönen URL'i kaydet.
    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append("files", file)
            const res = await fetch("/admin/uploads", { method: "POST", body: fd, credentials: "include" })
            if (!res.ok) throw new Error()
            const data = await res.json()
            const url = data?.files?.[0]?.url || data?.uploads?.[0]?.url
            if (!url) throw new Error()
            setHeroImage(url)
            toast.success("Görsel yüklendi. Kaydetmeyi unutmayın.")
        } catch {
            toast.error("Görsel yüklenemedi")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        if (!selectedTenantId) return
        setSaving(true)
        
        const tenant = tenants.find(x => x.id === selectedTenantId)
        const currentSettings = tenant?.settings || {}
        // ÖNEMLİ: mevcut storefront config'i SPREAD ile korunur — bu formda olmayan
        // alanlar (footer.categoryLinks, email.templates, commerce vb.) silinmez.
        const currentSf = currentSettings.storefront || {}

        const updatedSettings = {
            ...currentSettings,
            storefront: {
                ...currentSf,
                contact: {
                    person: contactPerson,
                    phone: contactPhone,
                    email: contactEmail,
                    address: contactAddress,
                },
                socials: {
                    instagram: socialIg,
                    facebook: socialFb,
                    x: socialX,
                    youtube: socialYt,
                },
                links: {
                    kurumsal: kurumsalLinks,
                    musteri: musteriLinks,
                    yasal: yasalLinks,
                },
                heroImage,
                branding: {
                    ...(currentSf.branding || {}),
                    description: brandDescription,
                    keywords: brandKeywords.split(",").map(k => k.trim()).filter(Boolean),
                },
                ai: {
                    ...(currentSf.ai || {}),
                    greeting: aiGreeting,
                    chatEnabled: aiChatEnabled,
                    whatsappLink: whatsappLink,
                },
                ageGate: {
                    ...(currentSf.ageGate || {}),
                    enabled: ageGateEnabled,
                    message: ageGateMessage,
                },
                email: {
                    ...(currentSf.email || {}),
                    senderName: emailSenderName,
                    senderAddress: emailSenderAddress,
                    iban: emailIban,
                },
            }
        }

        try {
            const res = await fetch(`/admin/tenants/${selectedTenantId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings: updatedSettings })
            })

            if (res.ok) {
                toast.success("Vitrin ayarları başarıyla kaydedildi")
                // Update local state
                setTenants(tenants.map(t => t.id === selectedTenantId ? { ...t, settings: updatedSettings } : t))
            } else {
                toast.error("Ayarlar kaydedilirken hata oluştu")
            }
        } catch (error) {
            console.error(error)
            toast.error("Sunucuya bağlanılamadı")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <Container className="p-8"><Text>Yükleniyor...</Text></Container>

    return (
        <Container className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <ComputerDesktop className="text-blue-500 w-8 h-8" />
                <Heading level="h1">Vitrin Ayarları</Heading>
            </div>

            {tenants.length === 0 ? (
                <Text>Henüz mağaza (tenant) tanımlanmamış.</Text>
            ) : (
                <div className="flex flex-col gap-8 max-w-4xl">
                    <div className="flex flex-col gap-2">
                        <Label weight="plus">Düzenlenecek Mağaza</Label>
                        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                            <Select.Trigger>
                                <Select.Value placeholder="Mağaza Seçin" />
                            </Select.Trigger>
                            <Select.Content>
                                {tenants.map(t => (
                                    <Select.Item key={t.id} value={t.id}>{t.name}</Select.Item>
                                ))}
                            </Select.Content>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Anasayfa Hero Görseli */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg md:col-span-2">
                            <Heading level="h2" className="text-base">Anasayfa Hero Görseli (Üst Banner)</Heading>
                            <Text className="text-ui-fg-muted text-sm">Görseli yükleyin veya URL yapıştırın. Geniş (örn. 1920×1080) görseller en iyi sonucu verir. Boş bırakılırsa varsayılan görsel kullanılır.</Text>
                            {heroImage && (
                                <img src={heroImage} alt="Hero önizleme" className="w-full max-h-56 object-cover rounded-lg border" />
                            )}
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="inline-flex">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploading} />
                                    <Button variant="secondary" isLoading={uploading} asChild>
                                        <span>{uploading ? "Yükleniyor..." : "Görsel Yükle"}</span>
                                    </Button>
                                </label>
                                {heroImage && (
                                    <Button variant="transparent" onClick={() => setHeroImage("")}>Kaldır</Button>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>veya Görsel URL'i</Label>
                                <Input value={heroImage} onChange={e => setHeroImage(e.target.value)} placeholder="https://... veya /images/premium_hero_banner.jpg" />
                            </div>
                        </div>

                        {/* İletişim */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">İletişim Bilgileri</Heading>
                            <div className="flex flex-col gap-2">
                                <Label>İlgili Kişi</Label>
                                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Örn: Mustafa Gürcüler" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Telefon</Label>
                                <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Örn: 0507 561 31 34" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>E-posta</Label>
                                <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Örn: destek@aquahavuz.com" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Adres</Label>
                                <Textarea value={contactAddress} onChange={e => setContactAddress(e.target.value)} placeholder="Örn: Kuşadası / Merkez" />
                            </div>
                        </div>

                        {/* Sosyal Medya */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">Sosyal Medya Linkleri</Heading>
                            <div className="flex flex-col gap-2">
                                <Label>Instagram URL</Label>
                                <Input value={socialIg} onChange={e => setSocialIg(e.target.value)} placeholder="https://instagram.com/..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Facebook URL</Label>
                                <Input value={socialFb} onChange={e => setSocialFb(e.target.value)} placeholder="https://facebook.com/..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>X (Twitter) URL</Label>
                                <Input value={socialX} onChange={e => setSocialX(e.target.value)} placeholder="https://x.com/..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>YouTube URL</Label>
                                <Input value={socialYt} onChange={e => setSocialYt(e.target.value)} placeholder="https://youtube.com/..." />
                            </div>
                        </div>

                        {/* Linkler */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg md:col-span-2">
                            <Heading level="h2" className="text-base">Footer Linkleri (Her satıra Başlık|URL şeklinde yazın)</Heading>
                            <Text className="text-ui-fg-muted text-sm">Örnek: <code>Hakkımızda|/pages/hakkimizda</code></Text>
                            
                            <div className="flex flex-col gap-2 mt-2">
                                <Label>Kurumsal</Label>
                                <Textarea rows={4} value={kurumsalLinks} onChange={e => setKurumsalLinks(e.target.value)} placeholder="Hakkımızda|/pages/hakkimizda&#10;Blog|/blog" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Müşteri Hizmetleri</Label>
                                <Textarea rows={4} value={musteriLinks} onChange={e => setMusteriLinks(e.target.value)} placeholder="Hesabım|/account&#10;Sepetim|/cart" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Yasal</Label>
                                <Textarea rows={4} value={yasalLinks} onChange={e => setYasalLinks(e.target.value)} placeholder="Gizlilik Politikası|/pages/gizlilik-politikasi&#10;Kullanım Koşulları|/pages/kullanim-kosullari" />
                            </div>
                        </div>

                        {/* Marka & SEO */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">Marka & SEO</Heading>
                            <div className="flex flex-col gap-2">
                                <Label>Marka Açıklaması (footer + arama motorları)</Label>
                                <Textarea rows={3} value={brandDescription} onChange={e => setBrandDescription(e.target.value)} placeholder="Mağazanızı 1-2 cümleyle anlatın" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>SEO Anahtar Kelimeleri (virgülle ayırın)</Label>
                                <Input value={brandKeywords} onChange={e => setBrandKeywords(e.target.value)} placeholder="örn: havuz malzemeleri, havuz kimyasalları" />
                            </div>
                        </div>

                        {/* AI Asistan */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">AI Asistan (Ayna)</Heading>
                            <div className="flex flex-col gap-2">
                                <Label>Karşılama Mesajı</Label>
                                <Textarea rows={3} value={aiGreeting} onChange={e => setAiGreeting(e.target.value)} placeholder="Örn: Merhaba! Ben Ayna. Size nasıl yardımcı olabilirim?" />
                                <Text className="text-ui-fg-muted text-xs">Boş bırakılırsa sektöre uygun varsayılan karşılama kullanılır.</Text>
                            </div>

                            {/* AI Sohbet Aç/Kapa — kapalıyken müşteriler WhatsApp'a yönlendirilir */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                                <input type="checkbox" checked={aiChatEnabled} onChange={e => setAiChatEnabled(e.target.checked)} />
                                <Label>AI Sohbeti Aktif</Label>
                            </div>
                            <Text className="text-ui-fg-muted text-xs">Kapatırsanız vitrindeki sohbet kutusu AI yerine WhatsApp'a yönlendirir.</Text>
                            <div className="flex flex-col gap-2">
                                <Label>WhatsApp Numarası / Linki</Label>
                                <Input value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} placeholder="Örn: 905551234567 veya https://wa.me/905551234567" />
                                <Text className="text-ui-fg-muted text-xs">AI sohbeti kapalıyken müşteriler bu numaraya yönlendirilir.</Text>
                            </div>
                        </div>

                        {/* 18+ Yaş Kapısı */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">18+ Yaş Kapısı</Heading>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={ageGateEnabled} onChange={e => setAgeGateEnabled(e.target.checked)} />
                                <span className="text-sm">Bu mağazada yaş doğrulaması göster (18+ ürünler için yasal gereklilik)</span>
                            </label>
                            <div className="flex flex-col gap-2">
                                <Label>Uyarı Metni</Label>
                                <Textarea rows={2} value={ageGateMessage} onChange={e => setAgeGateMessage(e.target.value)} placeholder="Örn: Bu ürünler nikotin içerir ve yalnızca 18 yaş ve üzeri kişilere yöneliktir." />
                            </div>
                        </div>

                        {/* E-posta & Havale */}
                        <div className="flex flex-col gap-4 p-4 border rounded-lg">
                            <Heading level="h2" className="text-base">E-posta & Havale</Heading>
                            <div className="flex flex-col gap-2">
                                <Label>Gönderici Adı (sipariş e-postaları)</Label>
                                <Input value={emailSenderName} onChange={e => setEmailSenderName(e.target.value)} placeholder="Örn: Aqua Havuz" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Gönderici E-posta Adresi</Label>
                                <Input value={emailSenderAddress} onChange={e => setEmailSenderAddress(e.target.value)} placeholder="Örn: siparis@magazaniz.com" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>IBAN (Havale/EFT ödeme talimatı)</Label>
                                <Input value={emailIban} onChange={e => setEmailIban(e.target.value)} placeholder="TR__ ____ ____ ____ ____ ____ __" />
                                <Text className="text-ui-fg-muted text-xs">Boş bırakılırsa havale siparişlerinde müşteriye IBAN GÖNDERİLMEZ.</Text>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={handleSave} isLoading={saving}>
                            Ayarları Kaydet
                        </Button>
                    </div>
                </div>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Vitrin Ayarları",
    icon: ComputerDesktop,
})

export default StorefrontSettingsPage
