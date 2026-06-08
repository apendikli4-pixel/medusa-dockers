"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"

export default function WishlistButton({ 
    productId, 
    className = "" 
}: { 
    productId: string
    className?: string 
}) {
    const [isLiked, setIsLiked] = useState(false)
    const [loading, setLoading] = useState(true)
    const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)

    // Check initial status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("/api/wishlist")
                if (res.ok) {
                    const data = await res.json()
                    const item = data.wishlist?.find((w: any) => w.product_id === productId)
                    if (item) {
                        setIsLiked(true)
                        setWishlistItemId(item.id)
                    }
                }
            } catch (e) {
                console.error("Wishlist status fetch error", e)
            } finally {
                setLoading(false)
            }
        }
        fetchStatus()
    }, [productId])

    const toggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault() // prevent navigating to product detail if inside Link
        e.stopPropagation()
        
        if (loading) return

        // Optimistic UI update
        const previousState = isLiked
        setIsLiked(!previousState)
        setLoading(true)

        try {
            if (previousState && wishlistItemId) {
                // Remove from wishlist
                const res = await fetch(`/api/wishlist/${wishlistItemId}`, { method: "DELETE" })
                if (!res.ok) throw new Error("Silinemedi")
                setWishlistItemId(null)
            } else {
                // Add to wishlist
                const res = await fetch("/api/wishlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ product_id: productId })
                })
                if (res.status === 401) {
                    // Not logged in -> redirect or alert
                    alert("Favorilere eklemek için lütfen giriş yapın.")
                    window.location.href = "/tr/account/login"
                    setIsLiked(previousState)
                    return
                }
                if (!res.ok) throw new Error("Eklenemedi")
                const data = await res.json()
                setWishlistItemId(data.wishlist_item?.id)
            }
        } catch (e) {
            console.error(e)
            // Revert optimistic update
            setIsLiked(previousState)
            alert("İşlem sırasında bir hata oluştu.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button 
            onClick={toggleWishlist}
            disabled={loading && !wishlistItemId} // Only fully disable on initial load
            className={`flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 ${className}`}
            aria-label="Favorilere Ekle"
        >
            <Heart 
                size={20} 
                className={`transition-colors duration-300 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} 
            />
        </button>
    )
}
