"use client"
import { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export default function SearchBox({ countryCode }: { countryCode: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()
    const [val, setVal] = useState(params.get("q") || "")
    const [pending, startTransition] = useTransition()

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault()
        startTransition(() => {
            const q = val.trim()
            // Arama yapılırsa ana sayfaya yönlendir (kategori sayfasından çıkar)
            const onHome = pathname === `/${countryCode}` || pathname === `/${countryCode}/`
            if (q) {
                router.push(`/${countryCode}?q=${encodeURIComponent(q)}`)
            } else if (onHome) {
                router.push(`/${countryCode}`)
            }
        })
    }

    return (
        <form onSubmit={submit} className="ag-search" role="search">
            <input
                type="search"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="Ürün ara..."
                aria-label="Ürün ara"
            />
            <button type="submit" disabled={pending} aria-label="Ara">
                {pending ? "..." : "Ara"}
            </button>
        </form>
    )
}
