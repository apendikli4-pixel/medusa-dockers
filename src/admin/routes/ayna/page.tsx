// @ts-nocheck
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Textarea } from "@medusajs/ui"
import { Sparkles, ArrowRightOnRectangle } from "@medusajs/icons"
import { useState, useRef, useEffect } from "react"

const AynaDashboardPage = () => {
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([
        { role: "agent", content: "Sistem Yöneticisi doğrulandı. Mağaza arayüzünden bağımsız, tam yetkili Ayna Yönetim zihnine hoş geldiniz. \nNe yapmak istersiniz?\nÖrn: 'Apple iPhone fiyatını 80000 yap', 'Yeni bir kulaklık kategorisi oluştur'." }
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSend = async () => {
        const userMsg = (input || "").trim()
        if (!userMsg || loading) return

        setMessages(prev => [...prev, { role: "user", content: userMsg }])
        setInput("")
        setLoading(true)

        try {
            const res = await fetch("/admin/ayna/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg }),
            })

            if (!res.ok) {
                throw new Error(`API Hatası: ${res.status}`)
            }

            const data = await res.json()
            setMessages(prev => [...prev, { role: "agent", content: data.response || "Komut tamamlandı." }])

        } catch (error: any) {
            setMessages(prev => [...prev, { role: "agent", content: `Bir hata oluştu: ${error.message}` }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Container className="p-0 h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-ui-bg-base border-none">
            {/* Header */}
            <div className="p-8 border-b bg-ui-bg-subtle/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 shadow-sm">
                        <Sparkles className="text-blue-500 w-8 h-8 drop-shadow-sm" />
                    </div>
                    <div>
                        <Heading level="h1" className="text-2xl font-bold tracking-tight">Ayna Yönetici Asistanı</Heading>
                        <Text className="text-ui-fg-muted mt-1 font-medium italic">
                            Mağazanızın tam kontrolü için sınırsız yetkiye sahip yapay zeka arayüzü.
                        </Text>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className="flex items-center gap-2 mb-2 px-2">
                            {msg.role === "agent" && <Sparkles className="w-4 h-4 text-blue-500" />}
                            <span className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-[0.15em]">
                                {msg.role === "user" ? "Yönetici" : "Ayna (Yönetici Zihni)"}
                            </span>
                        </div>
                        <div
                            className={`max-w-[85%] p-5 rounded-3xl whitespace-pre-wrap text-[14px] leading-relaxed shadow-md border ${msg.role === "user"
                                ? "bg-blue-600 text-white border-blue-500 rounded-tr-none shadow-blue-500/10"
                                : "bg-ui-bg-component text-ui-fg-base border-ui-border-base rounded-tl-none shadow-black/5"
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex flex-col items-start animate-fade-in">
                        <div className="px-2 mb-2">
                            <span className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-[0.15em]">Ayna Düşünüyor...</span>
                        </div>
                        <div className="bg-ui-bg-component border border-ui-border-base p-5 rounded-3xl rounded-tl-none shadow-sm flex gap-2 items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area - Command Center Style */}
            <div className="p-8 border-t bg-ui-bg-subtle/30">
                <div className="max-w-4xl mx-auto relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[22px] blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                    <div className="relative bg-ui-bg-component border border-ui-border-base rounded-2xl shadow-xl overflow-hidden focus-within:border-blue-500/50 transition-all duration-300">
                        <Textarea
                            className="w-full border-none focus:ring-0 text-lg p-5 min-h-[120px] resize-none bg-transparent"
                            placeholder="Ayna'ya bir talimat verin... (Örn: 'Tüm ürünlerde %10 indirim yap', 'Yeni bir kategori oluştur' vb.)"
                            value={input}
                            onChange={(e: any) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <div className="flex justify-between items-center px-5 py-3 border-t bg-ui-bg-subtle/50">
                            <Text className="text-xs text-ui-fg-muted font-medium">Shift + Enter ile alt satıra geçebilirsiniz</Text>
                            <Button
                                variant="primary"
                                onClick={handleSend}
                                disabled={!((input || "").trim()) || loading}
                                className="px-6 rounded-lg gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                            >
                                <span className="font-bold">Komutu Çalıştır</span>
                                <ArrowRightOnRectangle className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    )
}


export const config = defineRouteConfig({
    label: "Ayna Asistan",
    icon: Sparkles,
})

export default AynaDashboardPage
