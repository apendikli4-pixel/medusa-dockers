import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function GET() {
    try {
        const cookieStore = await cookies()
        const cookieStr = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

        const response = await fetch(`${BACKEND_URL}/store/wishlist`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-publishable-api-key": PUBLISHABLE_KEY,
                "Cookie": cookieStr
            }
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
        const cookieStr = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
        
        const response = await fetch(`${BACKEND_URL}/store/wishlist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-publishable-api-key": PUBLISHABLE_KEY,
                "Cookie": cookieStr
            },
            body: JSON.stringify(body)
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
