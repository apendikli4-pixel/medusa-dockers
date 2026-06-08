import { redirect } from "next/navigation"
import Link from "next/link"
import { retrieveCustomer } from "@/lib/server/customer"
import { getProductsByIds } from "@/lib/server/data"
import ProductCard from "@/components/ProductCard"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export default async function WishlistPage({
    params,
}: {
    params: Promise<{ countryCode: string }>
}) {
    const { countryCode } = await params
    const customer = await retrieveCustomer()
    
    if (!customer) {
        redirect(`/${countryCode}/account/login?redirectTo=/${countryCode}/account/wishlist`)
    }

    // Server-side fetch wishlist from proxy or direct backend
    // We will use direct backend since we are in a server component and have cookies
    const cookieStore = await cookies()
    const cookieStr = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
    
    let wishlistItems: any[] = []
    
    try {
        const response = await fetch(`${BACKEND_URL}/store/wishlist`, {
            headers: {
                "Cookie": cookieStr,
                "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
            },
            cache: 'no-store'
        })
        if (response.ok) {
            const data = await response.json()
            wishlistItems = data.wishlist || []
        }
    } catch (e) {
        console.error("Failed to fetch wishlist", e)
    }

    // Get products details
    const productIds = wishlistItems.map(item => item.product_id)
    const products = productIds.length > 0 ? await getProductsByIds(productIds) : []

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/${countryCode}/account`} className="text-gray-500 hover:text-gray-900 transition-colors">
                    ← Hesabıma Dön
                </Link>
                <h1 className="text-3xl font-heading font-bold text-gray-900">Favorilerim</h1>
            </div>

            {products.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="text-6xl mb-6">🤍</div>
                    <h2 className="text-2xl font-semibold mb-4">Favori listeniz henüz boş</h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                        Beğendiğiniz ürünlerdeki kalp ikonuna tıklayarak favorilerinize ekleyebilir ve daha sonra kolayca ulaşabilirsiniz.
                    </p>
                    <Link 
                        href={`/${countryCode}`} 
                        className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-8 py-4 transition-colors shadow-sm"
                    >
                        Alışverişe Başla
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} countryCode={countryCode} />
                    ))}
                </div>
            )}
        </main>
    )
}
