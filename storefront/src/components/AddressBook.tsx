"use client"

import { useState } from "react"
import { MapPin, Plus, Trash2, X, Building2, User, Phone, CheckCircle2 } from "lucide-react"

export default function AddressBook({ 
    initialAddresses,
    countryCode 
}: { 
    initialAddresses: any[]
    countryCode: string 
}) {
    const [addresses, setAddresses] = useState<any[]>(initialAddresses)
    const [isAdding, setIsAdding] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    // Form states
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        company: "",
        phone: "",
        address_1: "",
        address_2: "",
        city: "",
        province: "",
        postal_code: "",
        country_code: countryCode.toLowerCase(),
        address_name: "Ev",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsSubmitting(true)

        try {
            const res = await fetch("/api/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Adres eklenemedi")
            }

            const data = await res.json()
            // Medusa V2 returns { address: {...} } or { customer: {...} }
            // Let's just refetch or optimistically update. The proxy returns the raw Medusa response.
            // Actually, we can just do a hard refresh to get the server to re-render.
            window.location.reload()
            
        } catch (err: any) {
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bu adresi silmek istediğinize emin misiniz?")) return
        
        try {
            const res = await fetch(`/api/addresses/${id}`, {
                method: "DELETE"
            })
            if (res.ok) {
                setAddresses(addresses.filter(a => a.id !== id))
            } else {
                alert("Silme işlemi başarısız oldu.")
            }
        } catch (e) {
            alert("Bir hata oluştu.")
        }
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-heading font-bold text-gray-900">Adreslerim</h2>
                    <p className="text-gray-500 mt-1">Kayıtlı teslimat ve fatura adreslerinizi yönetin.</p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm hover-elevate"
                    >
                        <Plus size={20} /> Yeni Adres Ekle
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-heading font-bold flex items-center gap-2">
                            <MapPin className="text-blue-500" /> Yeni Adres Ekle
                        </h3>
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><User size={16} className="text-gray-400"/> Ad</label>
                                <input required name="first_name" value={formData.first_name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Soyad</label>
                                <input required name="last_name" value={formData.last_name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Phone size={16} className="text-gray-400"/> Telefon</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5"><Building2 size={16} className="text-gray-400"/> Şirket (Opsiyonel)</label>
                                <input name="company" value={formData.company} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres Başlığı (Örn: Ev, İş)</label>
                            <input required name="address_name" value={formData.address_name} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Açık Adres (Sokak, Mahalle, Kapı No)</label>
                            <input required name="address_1" value={formData.address_1} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adres Devamı (Bina Adı vb. Opsiyonel)</label>
                            <input name="address_2" value={formData.address_2} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">İlçe / Şehir</label>
                                <input required name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">İl</label>
                                <input required name="province" value={formData.province} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Posta Kodu</label>
                                <input required name="postal_code" value={formData.postal_code} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center gap-4">
                            <button 
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover-elevate"
                            >
                                {isSubmitting ? "Kaydediliyor..." : <><CheckCircle2 size={20} /> Kaydet</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!isAdding && addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-3xl border border-dashed border-gray-300 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-400">
                        <MapPin size={32} />
                    </div>
                    <h3 className="font-heading font-medium text-xl text-gray-900 mb-2">Henüz adres eklemediniz</h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                        Alışverişlerinizi daha hızlı tamamlamak için bir teslimat adresi kaydedin.
                    </p>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-md hover-elevate"
                    >
                        Adres Ekle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map(address => (
                        <div key={address.id} className="relative group bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleDelete(address.id)}
                                    className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <MapPin size={20} />
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                    {address.address_name || "Kayıtlı Adres"}
                                </h3>
                            </div>
                            
                            <div className="space-y-1.5 text-gray-600">
                                <p className="font-medium text-gray-900">{address.first_name} {address.last_name}</p>
                                {address.company && <p className="text-sm">{address.company}</p>}
                                <p className="text-sm mt-2">{address.address_1}</p>
                                {address.address_2 && <p className="text-sm">{address.address_2}</p>}
                                <p className="text-sm">{address.city}, {address.province} {address.postal_code}</p>
                                <p className="text-sm text-gray-400 mt-2">{address.country_code?.toUpperCase()}</p>
                                {address.phone && <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5"><Phone size={14}/> {address.phone}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
