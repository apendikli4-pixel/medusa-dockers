"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addLineAction } from "@/actions/cart"

export default function AddToCartButton({ variantId, label = "Sepete Ekle" }: { variantId: string; label?: string }) {
    const [pending, startTransition] = useTransition()
    const [msg, setMsg] = useState<string | null>(null)
    const router = useRouter()

    return (
        <div className="ag-add-block">
            <button
                className="ag-btn-primary"
                disabled={pending}
                onClick={() =>
                    startTransition(async () => {
                        setMsg(null)
                        const res = await addLineAction(variantId, 1)
                        if (res.ok) {
                            setMsg("Sepete eklendi ✓")
                            router.refresh()
                        } else {
                            setMsg("Hata: " + res.error)
                        }
                    })
                }
            >
                {pending ? "Ekleniyor..." : label}
            </button>
            {msg && <p className="ag-add-msg">{msg}</p>}
        </div>
    )
}
