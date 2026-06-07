"use client"

import React, { useState, KeyboardEvent, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Bot, User, Trash2, Camera } from "lucide-react"
import { useAynaChat } from "../hooks/use-ayna-chat"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind class birleştirici yardımcı fonksiyon
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export default function ChatWidget() {
    const { 
        messages, 
        isLoading, 
        isOpen, 
        toggleChat, 
        sendMessage, 
        clearHistory,
        messagesEndRef 
    } = useAynaChat()
    
    const [inputValue, setInputValue] = useState("")
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
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

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="mb-4 w-[380px] h-[600px] max-h-[80vh] flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-2xl"
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between p-4 text-white shadow-md"
                            style={{ background: "var(--ag-primary)" }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                                    <Bot size={22} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold leading-tight text-white">Ayna AI</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                                        </span>
                                        <p className="text-xs text-blue-100 font-medium">Çevrimiçi</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={clearHistory}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Sohbeti Temizle"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={toggleChat}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-white/30 scroll-smooth">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "flex w-full",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={cn(
                                        "flex max-w-[85%] gap-2",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <div className={cn(
                                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-1",
                                            msg.role === "user" 
                                                ? "bg-blue-100 text-blue-600" 
                                                : "bg-gray-100 text-gray-600 border border-gray-200"
                                        )}>
                                            {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                        </div>
                                        <div
                                            className={cn(
                                                "relative rounded-2xl px-4 py-2.5 shadow-sm text-[0.95rem] leading-relaxed",
                                                msg.role === "user" ? "text-white rounded-tr-sm" : "rounded-tl-sm"
                                            )}
                                            style={
                                                msg.role === "user"
                                                    ? { background: "var(--ag-primary)" }
                                                    : { background: "var(--ag-bg-card)", color: "var(--ag-text)", border: "1px solid var(--ag-border)" }
                                            }
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex w-full justify-start"
                                >
                                    <div className="flex max-w-[85%] gap-2 flex-row">
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-1 bg-gray-100 text-gray-600 border border-gray-200">
                                            <Bot size={16} />
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3.5 bg-white border border-gray-100 shadow-sm">
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white/90 backdrop-blur-md border-t border-gray-100">
                            {selectedImage && (
                                <div className="mb-2 relative inline-block">
                                    <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-gray-200 shadow-sm" />
                                    <button 
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            )}
                            <div className="relative flex items-center">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    className="absolute left-1.5 p-2 text-gray-400 hover:text-blue-500 transition-colors z-10"
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
                                    placeholder="Ayna'ya bir soru sorun..."
                                    className="w-full rounded-full bg-gray-100/80 border-transparent py-3.5 pl-10 pr-12 text-[0.95rem] text-gray-800 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!inputValue.trim() && !selectedImage) || isLoading}
                                    aria-label="Mesaj gönder"
                                    style={{ background: "var(--ag-primary)" }}
                                    className="absolute right-1.5 p-2.5 rounded-full text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-md transform hover:scale-105 active:scale-95"
                                >
                                    <Send size={18} className={cn("ml-0.5", isLoading ? "animate-pulse" : "")} />
                                </button>
                            </div>
                            <div className="mt-2 text-center">
                                <span className="text-[0.65rem] text-gray-400 font-medium tracking-wide">AYNA GENESIS AI GÜVENCESİYLE</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleChat}
                aria-label={isOpen ? "Sohbeti kapat" : "Ayna asistanı aç"}
                style={{ background: isOpen ? "var(--ag-text)" : "var(--ag-primary)" }}
                className="flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 z-50 relative overflow-hidden text-white hover:opacity-90 group"
            >
                
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
                                <X size={26} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="open"
                                initial={{ opacity: 0, rotate: 90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: -90 }}
                                transition={{ duration: 0.2 }}
                            >
                                <MessageCircle size={28} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Notification Badge */}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </motion.button>
        </div>
    )
}
