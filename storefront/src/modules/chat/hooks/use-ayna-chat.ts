import { useState, useCallback, useRef, useEffect } from "react"

export type Message = {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
}

export function useAynaChat() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Merhaba! Ben Ayna. Havuz malzemeleri, bakım tavsiyeleri veya siparişleriniz hakkında size nasıl yardımcı olabilirim?",
            timestamp: new Date(),
        },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    
    // Auto-scroll için ref
    const messagesEndRef = useRef<HTMLDivElement>(null)

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
                // Sadece data payload'ını gönder (örneğin "data:image/jpeg;base64,..." ise ayıklayıp gönderebiliriz, ancak backend direkt base64 alıyor)
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
                content: "Üzgünüm, şu an bağlantı sorunu yaşıyorum. Lütfen biraz sonra tekrar deneyin.",
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
            content: "Merhaba! Ben Ayna. Size nasıl yardımcı olabilirim?",
            timestamp: new Date(),
        }])
    }, [])

    return {
        messages,
        isLoading,
        error,
        isOpen,
        toggleChat,
        sendMessage,
        clearHistory,
        messagesEndRef
    }
}
