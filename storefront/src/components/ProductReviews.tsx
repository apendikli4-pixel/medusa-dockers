"use client"

import { useState, useEffect } from "react"

export default function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [rating, setRating] = useState(5)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState("")

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch(`/api/reviews?productId=${productId}`)
                if (res.ok) {
                    const data = await res.json()
                    setReviews(data.reviews || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchReviews()
    }, [productId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setMessage("")

        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId, rating, title, content })
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage(data.error || "Yorum gönderilemedi. Giriş yaptığınızdan emin olun.")
            } else {
                setMessage("Yorumunuz başarıyla gönderildi! Onaylandıktan sonra burada görünecektir.")
                setRating(5)
                setTitle("")
                setContent("")
            }
        } catch (e) {
            setMessage("Bir hata oluştu.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="mt-16 pt-16 border-t border-gray-200">
            <h2 className="text-2xl font-bold font-heading mb-8">Müşteri Yorumları</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    {loading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <p className="text-gray-500 italic">Bu ürün için henüz yorum yapılmamış. İlk yorum yapan siz olun!</p>
                    ) : (
                        reviews.map((review: any) => (
                            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                                        ))}
                                    </div>
                                    <span className="font-semibold text-gray-900">{review.title}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                    <span className="font-medium">{review.customer_name}</span>
                                    {review.is_verified_purchase && (
                                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold">Doğrulanmış Alıcı</span>
                                    )}
                                    <span>•</span>
                                    <span>{new Date(review.created_at).toLocaleDateString("tr-TR")}</span>
                                </div>
                                <p className="text-gray-700">{review.content}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl h-fit border border-gray-100">
                    <h3 className="font-bold text-lg mb-4">Yorum Yazın</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Puanınız</label>
                            <select 
                                value={rating} 
                                onChange={(e) => setRating(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[var(--ag-primary)] outline-none"
                            >
                                <option value={5}>5 Yıldız - Harika</option>
                                <option value={4}>4 Yıldız - Çok İyi</option>
                                <option value={3}>3 Yıldız - Ortalama</option>
                                <option value={2}>2 Yıldız - Kötü</option>
                                <option value={1}>1 Yıldız - Berbat</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[var(--ag-primary)] outline-none"
                                placeholder="Yorumunuzu özetleyin"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İncelemeniz</label>
                            <textarea 
                                required
                                minLength={5}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[var(--ag-primary)] outline-none"
                                placeholder="Ürün hakkında neler düşünüyorsunuz?"
                            ></textarea>
                        </div>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full bg-[var(--ag-primary)] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
                        </button>
                        
                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.includes('başarıyla') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
