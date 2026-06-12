import { useState, useCallback, useRef, useEffect } from "react"

export type Message = {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

/**
 * Güvenlik sabitleri — client-side savunma katmanı.
 * Sunucu tarafında da aynı limitler mevcuttur (çift katmanlı koruma).
 */
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB (sunucu 10MB kabul eder, client daha sıkı)
const MESSAGE_COOLDOWN_MS = 2000 // Mesajlar arası minimum 2 saniye

/** Mağaza config'i yüklenemezse kullanılacak nötr karşılama (sektör/mağaza adı içermez). */
const NEUTRAL_GREETING = "Merhaba! Ben Ayna. Size nasıl yardımcı olabilirim?"

export function useAynaChat(greeting?: string) {
    // Karşılama mesajı MAĞAZA CONFIG'İNDEN gelir (layout → ChatWidget → buraya);
    // hardcode sektör metni yasak (vape mağazasında havuz selamlaması hatasının kökü).
    const welcome = greeting || NEUTRAL_GREETING
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: welcome,
            timestamp: new Date(),
        },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [cooldown, setCooldown] = useState(false)
    
    // Auto-scroll için ref
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const lastSendTime = useRef<number>(0)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    const toggleChat = useCallback(() => setIsOpen(prev => !prev), [])

    const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
        if (!content.trim() && !imageBase64) return

        // Client-side rate limiting — 2 saniye cooldown
        const now = Date.now()
        if (now - lastSendTime.current < MESSAGE_COOLDOWN_MS) {
            setError("Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.")
            return
        }
        lastSendTime.current = now
        setCooldown(true)
        setTimeout(() => setCooldown(false), MESSAGE_COOLDOWN_MS)

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
            timestamp: new Date(),
        }

        setMessages(prev => [...prev, userMessage])
        setIsLoading(true)
        setError(null)

        try {
            const bodyPayload: any = { message: content }
            if (imageBase64) {
                // Dosya boyutu kontrolü (base64 encoded)
                const sizeBytes = imageBase64.length * 0.75 // Base64 → byte yaklaşık
                if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
                    throw new Error(
                        `Görsel çok büyük (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Lütfen 5MB'dan küçük bir görsel yükleyin.`
                    )
                }
                const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
                bodyPayload.image = base64Data;
            }

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
            })

            if (!response.ok) {
                throw new Error("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.")
            }

            const data = await response.json()

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response || "Şu an yanıt veremiyorum.",
                timestamp: new Date(),
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (err: any) {
            setError(err.message || "Bir hata oluştu.")
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: err.message || "Üzgünüm, şu an bağlantı sorunu yaşıyorum. Lütfen biraz sonra tekrar deneyin.",
                timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }, [])

    const clearHistory = useCallback(() => {
        setMessages([{
            id: "welcome",
            role: "assistant",
            content: welcome,
            timestamp: new Date(),
        }])
    }, [welcome])

    return {
        messages,
        isLoading,
        error,
        isOpen,
        cooldown,
        toggleChat,
        sendMessage,
        clearHistory,
        messagesEndRef
    }
}
