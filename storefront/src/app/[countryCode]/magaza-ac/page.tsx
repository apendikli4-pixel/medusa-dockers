"use client"

import { useState } from "react"

// Backend VALID_SECTORS ile aynı anahtarlar; kullanıcıya Türkçe etiketler.
const SECTORS: { value: string; label: string }[] = [
    { value: "pool", label: "Havuz & Kimyasal" },
    { value: "vape", label: "Vape & Elektronik Sigara" },
    { value: "retail", label: "Genel Perakende" },
    { value: "horeca", label: "Otel / Restoran / Kafe (HoReCa)" },
    { value: "b2b", label: "Toptan / B2B" },
    { value: "fashion", label: "Moda & Giyim" },
    { value: "electronics", label: "Elektronik" },
    { value: "villa", label: "Villa / Konaklama" },
    { value: "universal", label: "Diğer / Genel" },
]

const ADMIN_URL = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/app`

export default function MagazaAcPage() {
    const [form, setForm] = useState({ store_name: "", sector: "", email: "", password: "", owner_name: "" })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [done, setDone] = useState<{ slug: string } | null>(null)

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value })

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error || "Mağaza oluşturulamadı. Lütfen bilgileri kontrol edin.")
            } else {
                setDone({ slug: data.slug })
            }
        } catch {
            setError("Sunucu bağlantı hatası.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-slate-900 py-16 text-center px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">Mağazanı Aç</h1>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                    Dakikalar içinde kendi online mağazanı kur. Ürünlerini ekle, satışa başla — altyapı bizden.
                </p>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-3rem] md:mt-[-4rem]">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    {done ? (
                        <div className="flex flex-col items-center text-center space-y-5 py-6">
                            <span className="text-6xl">🎉</span>
                            <h2 className="text-2xl font-bold font-heading text-gray-900">Mağazan oluşturuldu!</h2>
                            <p className="text-gray-600 max-w-md">
                                <span className="font-semibold">{form.store_name}</span> hazır. Yönetim paneline,
                                girdiğin e-posta ve şifreyle giriş yapıp ürünlerini eklemeye başlayabilirsin.
                            </p>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700">
                                Mağaza adresin: <span className="font-mono font-semibold">{done.slug}</span>
                            </div>
                            <a
                                href={ADMIN_URL}
                                className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-4 font-semibold shadow-md transition-all"
                            >
                                Yönetim Paneline Git →
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Adı *</label>
                                <input
                                    type="text" name="store_name" required minLength={2} maxLength={60}
                                    value={form.store_name} onChange={onChange} placeholder="Örn: Mavi Deniz Havuz Market"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sektör *</label>
                                <select
                                    name="sector" required value={form.sector} onChange={onChange}
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="" disabled>Sektör seçin</option>
                                    {SECTORS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Yetkili Adı</label>
                                    <input
                                        type="text" name="owner_name" maxLength={80}
                                        value={form.owner_name} onChange={onChange} placeholder="Adınız Soyadınız"
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">E-posta *</label>
                                    <input
                                        type="email" name="email" required
                                        value={form.email} onChange={onChange} placeholder="ornek@magaza.com"
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre *</label>
                                <input
                                    type="password" name="password" required minLength={8}
                                    value={form.password} onChange={onChange} placeholder="En az 8 karakter"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Bu e-posta ve şifreyle yönetim paneline gireceksin.</p>
                            </div>

                            {error && (
                                <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{error}</p>
                            )}

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-semibold shadow-md transition-all disabled:opacity-50"
                            >
                                {loading ? "Mağazan oluşturuluyor..." : "Mağazamı Oluştur"}
                            </button>

                            <p className="text-center text-xs text-gray-500">
                                "Mağazamı Oluştur"a tıklayarak deneme sürecini başlatırsın. Ücretlendirme için ekibimiz seninle iletişime geçer.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </main>
    )
}
