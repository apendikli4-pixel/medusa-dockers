"use client"

import { useState } from "react"

export default function TrackOrderPage() {
    const [email, setEmail] = useState("")
    const [displayId, setDisplayId] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [order, setOrder] = useState<any>(null)
    const [returnReason, setReturnReason] = useState("")
    const [returning, setReturning] = useState(false)
    const [returnStatus, setReturnStatus] = useState<{type: "success" | "error" | null, message: string}>({type: null, message: ""})

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setOrder(null)

        try {
            const res = await fetch(`/api/track-order?email=${encodeURIComponent(email)}&display_id=${encodeURIComponent(displayId)}`)
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Sipariş bulunamadı.")
            } else {
                setOrder(data.order)
            }
        } catch (e) {
            setError("Sunucuya bağlanırken bir hata oluştu.")
        } finally {
            setLoading(false)
        }
    }

    const handleReturn = async (e: React.FormEvent) => {
        e.preventDefault()
        setReturning(true)
        setReturnStatus({type: null, message: ""})

        try {
            const res = await fetch("/api/returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    display_id: displayId,
                    reason: returnReason
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setReturnStatus({type: "error", message: data.error || "İade talebi oluşturulamadı."})
            } else {
                setReturnStatus({type: "success", message: "İade talebiniz başarıyla oluşturuldu. Müşteri hizmetlerimiz en kısa sürede sizinle iletişime geçecektir."})
                setReturnReason("")
            }
        } catch (e) {
            setReturnStatus({type: "error", message: "Sunucu hatası."})
        } finally {
            setReturning(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "text-yellow-600 bg-yellow-50 border-yellow-200"
            case "completed": return "text-green-600 bg-green-50 border-green-200"
            case "canceled": return "text-red-600 bg-red-50 border-red-200"
            default: return "text-gray-600 bg-gray-50 border-gray-200"
        }
    }

    const translateStatus = (status: string) => {
        switch (status) {
            case "pending": return "Bekliyor"
            case "completed": return "Tamamlandı"
            case "canceled": return "İptal Edildi"
            case "requires_action": return "İşlem Bekliyor"
            default: return status
        }
    }

    const translateFulfillment = (status: string) => {
        switch (status) {
            case "not_fulfilled": return "Hazırlanıyor"
            case "partially_fulfilled": return "Kısmen Kargolandı"
            case "fulfilled": return "Kargolandı"
            case "partially_shipped": return "Kısmen Gönderildi"
            case "shipped": return "Teslimata Çıktı / Gönderildi"
            case "partially_delivered": return "Kısmen Teslim Edildi"
            case "delivered": return "Teslim Edildi"
            default: return status || "Hazırlanıyor"
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto mt-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Sipariş Takibi</h1>
                    <p className="text-lg text-gray-600">Sisteme üye olmadan kargonuzun nerede olduğunu anında öğrenin.</p>
                </div>

                {/* Form Alanı */}
                <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 mb-8">
                    <form onSubmit={handleTrack} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresiniz</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Siparişi verirken kullandığınız e-posta"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sipariş Numarası</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={displayId}
                                    onChange={e => setDisplayId(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="Örn: 105"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-semibold text-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {loading ? "Sorgulanıyor..." : "Siparişimi Bul"}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                </div>

                {/* Sonuç Alanı */}
                {order && (
                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">Sipariş #{order.display_id}</h2>
                                <p className="text-gray-500 text-sm">
                                    Tarih: {new Date(order.created_at).toLocaleDateString("tr-TR")}
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                    Sipariş: {translateStatus(order.status)}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 border-gray-200 text-gray-700">
                                    Kargo: {translateFulfillment(order.fulfillment_status)}
                                </span>
                            </div>
                        </div>

                        {/* Alıcı Bilgileri (Maskeli) */}
                        {order.shipping_address && (
                            <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">Alıcı:</span> {order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                                <p className="text-sm text-gray-600 mt-1"><span className="font-semibold text-gray-900">Şehir:</span> {order.shipping_address.city || "Belirtilmemiş"}</p>
                            </div>
                        )}

                        {/* Kargo Takip Numaraları */}
                        {order.fulfillments && order.fulfillments.length > 0 ? (
                            <div className="mb-8">
                                <h3 className="font-semibold text-gray-900 mb-4">Kargo Durumu</h3>
                                <div className="space-y-4">
                                    {order.fulfillments.map((f: any) => (
                                        <div key={f.id} className="p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Gönderi ID: {f.id.split('_')[1]}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Oluşturulma: {new Date(f.created_at).toLocaleDateString("tr-TR")}</p>
                                                </div>
                                                {f.tracking_numbers && f.tracking_numbers.length > 0 ? (
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500 mb-1">Takip Numarası</p>
                                                        {f.tracking_numbers.map((tn: string, idx: number) => (
                                                            <a 
                                                                key={idx} 
                                                                href={`https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${tn}`} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="block text-blue-600 font-bold hover:underline"
                                                            >
                                                                {tn} ↗
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500 italic">Henüz takip numarası atanmamış</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-8 p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="text-gray-500">Bu sipariş için henüz kargo çıkışı yapılmamıştır.</p>
                            </div>
                        )}

                        {/* Sipariş Kalemleri */}
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">Sipariş İçeriği</h3>
                            <div className="space-y-4">
                                {order.items && order.items.map((item: any) => (
                                    <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                                        {item.thumbnail ? (
                                            <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded-lg bg-gray-100" />
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">Görsel Yok</div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.title}</p>
                                            <p className="text-sm text-gray-500">Adet: {item.quantity}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* İade Formu */}
                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4">Siparişi İade Et</h3>
                            {returnStatus.type === "success" ? (
                                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">
                                    ✅ {returnStatus.message}
                                </div>
                            ) : (
                                <form onSubmit={handleReturn} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Siparişinizin teslimatından itibaren 14 gün içerisinde iade talebinde bulunabilirsiniz. Lütfen iade nedeninizi detaylı bir şekilde açıklayınız.
                                    </p>
                                    <textarea 
                                        required 
                                        minLength={10}
                                        value={returnReason}
                                        onChange={e => setReturnReason(e.target.value)}
                                        placeholder="İade nedeniniz (En az 10 karakter)"
                                        rows={3}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none resize-y text-sm"
                                    ></textarea>
                                    
                                    {returnStatus.type === "error" && (
                                        <p className="text-red-600 text-sm mb-4">{returnStatus.message}</p>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={returning}
                                        className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                                    >
                                        {returning ? "Talebiniz Alınıyor..." : "İade Talebi Oluştur"}
                                    </button>
                                </form>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </main>
    )
}
