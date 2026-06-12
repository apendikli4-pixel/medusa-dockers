import { NextResponse } from "next/server"
import { backendProxyHeaders } from "@/lib/server/proxy-headers"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const response = await fetch(`${BACKEND_URL}/store/contact`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(await backendProxyHeaders())
            },
            body: JSON.stringify(body)
        })
        
        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
