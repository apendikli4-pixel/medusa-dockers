"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { updateLineAction, removeLineAction } from "@/actions/cart"

export default function CartItem({
    lineId,
    title,
    quantity,
    unitPrice,
    currency,
    thumbnail,
}: {
    lineId: string
    title: string
    quantity: number
    unitPrice: number
    currency: string
    thumbnail?: string | null
}) {
    const [pending, startTransition] = useTransition()
    const router = useRouter()
    const fmt = (n: number) =>
        new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency.toUpperCase() }).format(n)

    return (
        <div className="ag-cart-row">
            <div className="ag-cart-thumb relative w-16 h-16">
                {thumbnail ? (
                    <Image 
                        src={thumbnail} 
                        alt={title} 
                        fill
                        className="object-cover rounded"
                        sizes="64px"
                    />
                ) : (
                    <div className="ag-cart-thumb-ph">{title.charAt(0)}</div>
                )}
            </div>
            <div className="ag-cart-info">
                <h4>{title}</h4>
                <p className="ag-cart-unit">{fmt(unitPrice)}</p>
            </div>
            <div className="ag-cart-qty">
                <button
                    disabled={pending}
                    onClick={() => startTransition(async () => { await updateLineAction(lineId, quantity - 1); router.refresh() })}
                    aria-label="Azalt"
                >−</button>
                <span>{quantity}</span>
                <button
                    disabled={pending}
                    onClick={() => startTransition(async () => { await updateLineAction(lineId, quantity + 1); router.refresh() })}
                    aria-label="Arttır"
                >+</button>
            </div>
            <div className="ag-cart-total">{fmt(unitPrice * quantity)}</div>
            <button
                className="ag-cart-remove"
                disabled={pending}
                onClick={() => startTransition(async () => { await removeLineAction(lineId); router.refresh() })}
                aria-label="Kaldır"
            >×</button>
        </div>
    )
}
