"use client"

import React, { useState, KeyboardEvent, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, User, Trash2, Camera, Sparkles } from "lucide-react"
import { useAynaChat } from "../hooks/use-ayna-chat"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind class birleştirici yardımcı fonksiyon
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function ChatWidget({
    greeting,
    aiChatEnabled = true,
    whatsappLink = null,
}: {
    greeting?: string
    aiChatEnabled?: boolean
    whatsappLink?: string | null
}) {
    const {
        messages,
        isLoading,
        isOpen,
        toggleChat,
        sendMessage,
        clearHistory,
        messagesEndRef
    } = useAynaChat(greeting)

    // AI kapalı → müşteri WhatsApp'a yönlendirilir (admin'den yönetilir).
    const aiOff = aiChatEnabled === false
    // Numara normalizasyonu: yerel TR (0xxx) → uluslararası (90xxx); wa.me uluslararası ister.
    const waDigits = (whatsappLink || "").replace(/[^0-9]/g, "")
    const waIntl = waDigits.startsWith("0") ? `90${waDigits.slice(1)}` : waDigits
    const waHref = whatsappLink
        ? (whatsappLink.startsWith("http") ? whatsappLink : (waIntl ? `https://wa.me/${waIntl}` : null))
        : null
    
    const [inputValue, setInputValue] = useState("")
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // 5MB dosya boyutu limiti (client-side savunma)
            if (file.size > 5 * 1024 * 1024) {
                alert(`Görsel çok büyük (${(file.size / 1024 / 1024).toFixed(1)}MB). Lütfen 5MB'dan küçük bir görsel seçin.`)
                e.target.value = "" // Input'u temizle
                return
            }
            const reader = new FileReader()
            reader.onloadend = () => {
                setSelectedImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSend = () => {
        if ((!inputValue.trim() && !selectedImage) || isLoading) return
        sendMessage(inputValue, selectedImage || undefined)
        setInputValue("")
        setSelectedImage(null)
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isLoading, isOpen])

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="mb-4 w-[min(380px,calc(100vw-3rem))] sm:w-[420px] h-[650px] max-h-[85vh] flex flex-col overflow-hidden rounded-[2rem] border border-white/40 bg-white/60 backdrop-blur-2xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="relative flex items-center justify-between p-5 pb-4 border-b border-white/50 bg-white/40 z-10">
                            {/* Animated Background Glow */}
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none rounded-t-[2rem]">
                                <motion.div 
                                    animate={{ 
                                        rotate: [0, 360],
                                        scale: [1, 1.2, 1]
                                    }} 
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/20 blur-3xl rounded-full"
                                />
                                <motion.div 
                                    animate={{ 
                                        rotate: [360, 0],
                                        scale: [1, 1.3, 1]
                                    }} 
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400/20 blur-3xl rounded-full"
                                />
                            </div>

                            <div className="flex items-center gap-4 relative z-10">
                                {/* AI Animated Orb */}
                                <div className="relative flex h-12 w-12 items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-pulse-slow blur-sm opacity-60"></div>
                                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-700 shadow-inner">
                                        <Sparkles size={18} className="text-white" />
                                    </div>
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 rounded-full border border-white/30 border-dashed"
                                    ></motion.div>
                                </div>
                                <div>
                                    <h3 className="font-heading font-bold text-lg text-gray-900 tracking-tight">Ayna Genesis</h3>
                                    <p className="text-xs text-blue-600 font-semibold tracking-wider uppercase">Yapay Zeka Asistan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 relative z-10">
                                <button
                                    onClick={clearHistory}
                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-white/50 rounded-full transition-all"
                                    title="Sohbeti Temizle"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={toggleChat}
                                    className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-white/50 rounded-full transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth relative z-0">
                            {messages.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center opacity-70 pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-500">
                                        <Sparkles size={28} />
                                    </div>
                                    <h4 className="font-heading font-bold text-gray-800 text-lg mb-2">Nasıl yardımcı olabilirim?</h4>
                                    <p className="text-sm text-gray-500">Ürün arayabilir, fotoğraf yükleyebilir veya kargonuzu sorabilirsiniz.</p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3, type: "spring", stiffness: 250, damping: 20 }}
                                    className={cn(
                                        "flex w-full",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "flex max-w-[85%] gap-2",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        {/* Avatar */}
                                        <div className={cn(
                                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-auto mb-1",
                                            msg.role === "user" 
                                                ? "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 shadow-sm" 
                                                : "bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 shadow-sm"
                                        )}>
                                            {msg.role === "user" ? <User size={14} /> : <Sparkles size={14} />}
                                        </div>
                                        
                                        {/* Bubble */}
                                        <div
                                            className={cn(
                                                "relative px-5 py-3.5 shadow-sm text-[0.95rem] leading-relaxed border",
                                                msg.role === "user" 
                                                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-[1.5rem] rounded-br-sm border-blue-500" 
                                                    : "bg-white/80 backdrop-blur-md text-gray-800 rounded-[1.5rem] rounded-bl-sm border-white"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            
                            {/* Typing Indicator */}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex w-full justify-start"
                                >
                                    <div className="flex max-w-[85%] gap-2 flex-row">
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-auto mb-1 bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 shadow-sm">
                                            <Sparkles size={14} />
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-[1.5rem] rounded-bl-sm px-5 py-4 bg-white/80 backdrop-blur-md border border-white shadow-sm">
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="h-2 w-2 rounded-full bg-purple-400" />
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 rounded-full bg-purple-400" />
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="h-2 w-2 rounded-full bg-purple-400" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>

                        {/* Input Area — AI KAPALIYSA WhatsApp CTA, AÇIKSA normal sohbet girişi */}
                        {aiOff ? (
                            <div className="p-4 bg-white/60 backdrop-blur-xl border-t border-white/50 relative z-10 text-center space-y-3">
                                <p className="text-sm text-gray-600">Asistanımız şu an <span className="font-semibold text-green-600">WhatsApp</span> üzerinden yanıt veriyor.</p>
                                {waHref ? (
                                    <a
                                        href={waHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center w-full bg-green-500 hover:bg-green-600 text-white rounded-full py-3.5 font-semibold shadow-md transition-all"
                                    >
                                        WhatsApp'tan Bize Yazın
                                    </a>
                                ) : (
                                    <p className="text-xs text-gray-400">İletişim bilgisi henüz tanımlanmamış.</p>
                                )}
                            </div>
                        ) : (
                        <div className="p-4 bg-white/60 backdrop-blur-xl border-t border-white/50 relative z-10">
                            {selectedImage && (
                                <div className="mb-3 relative inline-block animate-fade-in-up">
                                    <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-2xl border-2 border-white shadow-lg" />
                                    <button 
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            
                            <div className="relative flex items-center bg-white/80 backdrop-blur-md rounded-full border border-gray-100 shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                                    title="Fotoğraf Yükle"
                                >
                                    <Camera size={20} />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                />
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Bir şeyler sorun..."
                                    className="flex-1 bg-transparent border-transparent py-2.5 px-2 text-[0.95rem] text-gray-800 placeholder-gray-400 focus:outline-none"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                                    aria-label="Mesaj gönder"
                                    className={cn(
                                        "p-3 rounded-full text-white transition-all transform flex-shrink-0 shadow-md",
                                        (!inputValue.trim() && !selectedImage) || isLoading 
                                            ? "bg-gray-300 scale-95 opacity-50" 
                                            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 hover:shadow-lg active:scale-95"
                                    )}
                                >
                                    <Send size={18} className={cn("ml-0.5", isLoading ? "animate-pulse" : "")} />
                                </button>
                            </div>
                            <div className="mt-3 flex justify-center items-center gap-1 opacity-60">
                                <Sparkles size={10} className="text-gray-500" />
                                <span className="text-[0.65rem] text-gray-500 font-medium tracking-widest uppercase">Ayna Genesis AI</span>
                            </div>
                        </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleChat}
                aria-label={isOpen ? "Sohbeti kapat" : "Ayna asistanı aç"}
                className={cn(
                    "flex items-center justify-center rounded-full shadow-2xl transition-all duration-500 z-50 relative overflow-hidden group border",
                    isOpen 
                        ? "h-14 w-14 bg-gray-900 text-white border-gray-700" 
                        : "h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white border-white/20"
                )}
            >
                {/* Floating Orb Background Animation (when closed) */}
                {!isOpen && (
                    <>
                        <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-1 bg-gradient-to-tr from-transparent via-white/30 to-transparent blur-sm rounded-full"
                        />
                    </>
                )}

                <div className="relative z-10 flex items-center justify-center w-full h-full">
                    <AnimatePresence mode="wait">
                        {isOpen ? (
                            <motion.div
                                key="close"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                            >
                                <X size={24} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="open"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Sparkles size={28} className="drop-shadow-lg" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Notification Badge */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></span>
                    </span>
                )}
            </motion.button>
        </div>
    )
}
