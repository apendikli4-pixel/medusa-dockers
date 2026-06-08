"use client"

import { useState } from "react"

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: "success" | "error" | null, message: string }>({ type: null, message: "" })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus({ type: null, message: "" })

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                setStatus({ type: "error", message: data.error || "Mesaj gönderilemedi." })
            } else {
                setStatus({ type: "success", message: "Mesajınız başarıyla alındı. En kısa sürede size dönüş yapacağız!" })
                setFormData({ name: "", email: "", phone: "", subject: "", message: "" })
            }
        } catch (e) {
            setStatus({ type: "error", message: "Sunucu bağlantı hatası." })
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-slate-900 py-16 text-center px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">İletişim</h1>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">Soru, görüş veya destek talepleriniz için bize her zaman ulaşabilirsiniz.</p>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-3rem] md:mt-[-4rem]">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
                    
                    {/* İletişim Bilgileri (Sol) */}
                    <div className="bg-blue-600 text-white p-10 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-500 rounded-full opacity-50 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-indigo-500 rounded-full opacity-50 blur-2xl"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold font-heading mb-6">Bize Ulaşın</h2>
                            <p className="text-blue-100 mb-10 leading-relaxed">Müşteri temsilcilerimiz mesai saatleri içerisinde size en hızlı şekilde yardımcı olmaktan mutluluk duyacaktır.</p>
                            
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">📍</span>
                                    <div>
                                        <h4 className="font-semibold text-lg">Genel Merkez</h4>
                                        <p className="text-blue-100 mt-1">Levent, Büyükdere Cd. No:195,<br/>34394 Şişli/İstanbul</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">📞</span>
                                    <div>
                                        <h4 className="font-semibold text-lg">Telefon</h4>
                                        <p className="text-blue-100 mt-1">+90 (850) 123 45 67</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl">✉️</span>
                                    <div>
                                        <h4 className="font-semibold text-lg">E-Posta</h4>
                                        <p className="text-blue-100 mt-1">destek@aynagenesis.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-16">
                            <p className="text-blue-200 text-sm">Çalışma Saatleri: Pzt-Cmt 09:00 - 18:00</p>
                        </div>
                    </div>

                    {/* Form (Sağ) */}
                    <div className="p-10 md:w-2/3 bg-white">
                        <h3 className="text-2xl font-bold font-heading text-gray-900 mb-6">Mesaj Gönderin</h3>
                        
                        {status.type === "success" ? (
                            <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[300px]">
                                <span className="text-5xl">✅</span>
                                <p className="text-xl font-medium">{status.message}</p>
                                <button onClick={() => setStatus({type:null, message:""})} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Yeni Mesaj Gönder</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Adınız Soyadınız *</label>
                                        <input 
                                            type="text" name="name" required value={formData.name} onChange={handleChange}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresiniz *</label>
                                        <input 
                                            type="email" name="email" required value={formData.email} onChange={handleChange}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefon Numaranız</label>
                                        <input 
                                            type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Konu *</label>
                                        <select 
                                            name="subject" required value={formData.subject} onChange={handleChange}
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="" disabled>Lütfen Bir Konu Seçin</option>
                                            <option value="İstek ve Öneri">İstek ve Öneri</option>
                                            <option value="Sipariş Sorunu">Sipariş Sorunu</option>
                                            <option value="Şikayet">Şikayet</option>
                                            <option value="Genel Bilgi">Genel Bilgi</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Mesajınız *</label>
                                    <textarea 
                                        name="message" required rows={5} minLength={10} value={formData.message} onChange={handleChange}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                                    ></textarea>
                                </div>

                                {status.type === "error" && (
                                    <p className="text-red-600 bg-red-50 p-3 rounded-lg text-sm">{status.message}</p>
                                )}

                                <button 
                                    type="submit" disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-semibold shadow-md transition-all disabled:opacity-50"
                                >
                                    {loading ? "Gönderiliyor..." : "Mesajı Gönder"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Google Maps Embed */}
                <div className="mt-16 rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-96 bg-gray-200">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3008.204595287515!2d29.008453315415714!3d41.064560979294246!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab613867c00e1%3A0xc3bbaaeeddb6b3bd!2zTGV2ZW50LCBCw7x5w7xrZGVyZSBDZC4sIDM0MzMwIEJlxZ9pa3RhxZ8vxBAnc3RhbmJ1bA!5e0!3m2!1str!2str!4v1620000000000!5m2!1str!2str" 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen={false} 
                        loading="lazy">
                    </iframe>
                </div>
            </div>
        </main>
    )
}
