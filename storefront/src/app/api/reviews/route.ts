import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")

    if (!productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    try {
        const response = await fetch(`${BACKEND_URL}/store/products/${productId}/reviews`, {
            headers: {
                "x-publishable-api-key": PUBLISHABLE_KEY,
            },
            next: { revalidate: 60 } // Cache for 60s
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const cookieStore = await cookies()
        
        const response = await fetch(`${BACKEND_URL}/store/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-publishable-api-key": PUBLISHABLE_KEY,
                "Cookie": cookieStore.toString(),
            },
            body: JSON.stringify(body),
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
