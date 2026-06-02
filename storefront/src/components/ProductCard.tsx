import Link from "next/link"
import Image from "next/image"
import type { StoreProduct } from "@/lib/server/data"
import { formatPrice } from "@/lib/server/data"
import { ShoppingBag, ArrowRight } from "lucide-react"

export default function ProductCard({ product, countryCode }: { product: StoreProduct; countryCode: string }) {
    const firstVariant = product.variants?.[0]
    const price = firstVariant?.calculated_price
    const firstLetter = product.title.charAt(0).toUpperCase()

    return (
        <Link
            href={`/${countryCode}/products/${product.handle}`}
            className="group flex flex-col rounded-3xl overflow-hidden shadow-sm hover:premium-shadow hover-elevate transition-all duration-500"
            style={{
                background: "var(--ag-bg-card)",
                border: "1px solid var(--ag-border)",
                borderRadius: "var(--ag-radius, 1.5rem)",
            }}
        >
            <div
                className="relative w-full aspect-[4/5] overflow-hidden"
                style={{ background: "var(--ag-bg)" }}
            >
                {product.thumbnail ? (
                    <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, var(--ag-bg), var(--ag-border))",
                        }}
                    >
                        <span
                            className="text-6xl font-heading font-bold drop-shadow-sm"
                            style={{ color: "var(--ag-muted)", opacity: 0.5 }}
                        >
                            {firstLetter}
                        </span>
                    </div>
                )}

                {/* Overlay Action */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, var(--ag-text) 12%, transparent)" }}
                >
                    <span
                        className="flex items-center gap-2 glass-panel px-6 py-3 rounded-full font-semibold text-sm translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                        style={{ color: "var(--ag-text)" }}
                    >
                        Hızlı İncele <ArrowRight size={16} />
                    </span>
                </div>
            </div>

            <div className="p-6 flex flex-col flex-grow relative z-10" style={{ background: "var(--ag-bg-card)" }}>
                <h3
                    className="font-heading font-semibold text-xl mb-2 line-clamp-1 transition-colors group-hover:opacity-80"
                    style={{ color: "var(--ag-text)" }}
                >
                    {product.title}
                </h3>
                <p
                    className="text-sm mb-6 line-clamp-2 leading-relaxed flex-grow"
                    style={{ color: "var(--ag-muted)" }}
                >
                    {product.description || "Bu koleksiyon ürünü hakkında detaylı bilgi yakında eklenecektir."}
                </p>
                <div
                    className="flex items-end justify-between pt-4"
                    style={{ borderTop: "1px solid var(--ag-border)" }}
                >
                    <div className="flex flex-col">
                        <span
                            className="text-[0.7rem] font-bold uppercase tracking-widest mb-1"
                            style={{ color: "var(--ag-muted)" }}
                        >
                            FİYAT
                        </span>
                        <span
                            className="text-2xl font-bold font-sans tracking-tight"
                            style={{ color: "var(--ag-primary)" }}
                        >
                            {price ? formatPrice(price.calculated_amount, price.currency_code) : "Fiyat Seçenekleri"}
                        </span>
                    </div>
                    <span
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:scale-110"
                        style={{ background: "var(--ag-bg)", color: "var(--ag-primary)" }}
                        aria-hidden
                    >
                        <ShoppingBag size={18} />
                    </span>
                </div>
            </div>
        </Link>
    )
}
