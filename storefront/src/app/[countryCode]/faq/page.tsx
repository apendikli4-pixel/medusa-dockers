"use client"

import { useState, useEffect } from "react"

export default function FAQPage() {
    const [faqs, setFaqs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const res = await fetch("/api/faq")
                if (res.ok) {
                    const data = await res.json()
                    setFaqs(data.faqs || [])
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchFaqs()
    }, [])

    const toggleOpen = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-slate-900 py-16 text-center px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">Sıkça Sorulan Sorular</h1>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">Aklınıza takılan soruların cevaplarını burada bulabilirsiniz.</p>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-[-3rem] md:mt-[-4rem]">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12 min-h-[400px]">
                    
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-2xl w-full"></div>
                            ))}
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-xl mb-4">🔍</p>
                            <p>Henüz bir soru eklenmemiş.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div 
                                    key={faq.id} 
                                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'border-blue-500 shadow-md shadow-blue-500/10' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    <button 
                                        className="w-full text-left px-6 py-5 flex justify-between items-center bg-white"
                                        onClick={() => toggleOpen(index)}
                                    >
                                        <span className={`font-semibold text-lg pr-8 ${openIndex === index ? 'text-blue-600' : 'text-gray-900'}`}>
                                            {faq.question}
                                        </span>
                                        <span className={`text-2xl transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}>
                                            ↓
                                        </span>
                                    </button>
                                    
                                    <div 
                                        className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <div className="h-px w-full bg-gray-100 mb-4"></div>
                                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </main>
    )
}
