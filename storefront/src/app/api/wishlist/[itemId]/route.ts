import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export async function DELETE(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
    try {
        const { itemId } = await params
        const cookieStore = await cookies()
        const cookieStr = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

        const response = await fetch(`${BACKEND_URL}/store/wishlist/${itemId}`, {
            method: "DELETE",
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
