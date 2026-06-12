import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { backendProxyHeaders } from "@/lib/server/proxy-headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")

    if (!productId) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    try {
        const response = await fetch(`${BACKEND_URL}/store/products/${productId}/reviews`, {
            headers: await backendProxyHeaders(),
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
                ...(await backendProxyHeaders()),
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
