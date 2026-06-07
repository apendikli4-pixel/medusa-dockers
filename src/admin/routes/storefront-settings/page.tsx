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
        }
    }, [selectedTenantId, tenants])

    const handleSave = async () => {
        if (!selectedTenantId) return
        setSaving(true)
        
        const tenant = tenants.find(x => x.id === selectedTenantId)
        const currentSettings = tenant?.settings || {}

        const updatedSettings = {
            ...currentSettings,
            storefront: {
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
                }
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
