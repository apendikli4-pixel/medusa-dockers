import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type AuthContextRequest = MedusaRequest & {
    auth_context?: {
        actor_id?: string
    }
}

type ConscienceCompliance = {
    isCompliant: boolean
    warning?: string
    suggestedLimit?: number
}

type ConscienceSetting = {
    monthly_limit?: number
    current_spending?: number
}

type ConscienceLog = {
    message?: string
    created_at?: string | Date
    metadata?: Record<string, unknown> | null
}

type ConscienceService = {
    checkBudgetCompliance: (customerId: string, currentCartTotal: number, currencyCode: string) => Promise<ConscienceCompliance>
    listConscienceSettings: (filters: { customer_id: string }) => Promise<ConscienceSetting[]>
    listConscienceLogs: (filters: { customer_id: string }, config?: Record<string, unknown>) => Promise<ConscienceLog[]>
}

type RemoteQueryResponse = {
    data?: unknown[]
}

type RemoteQueryService = {
    graph: (input: {
        entity: string
        fields: string[]
        filters?: Record<string, unknown>
    }) => Promise<RemoteQueryResponse>
}

function getNumberField(row: unknown, key: string): number {
    if (!row || typeof row !== "object") {
        return 0
    }

    const value = (row as Record<string, unknown>)[key]
    if (typeof value === "number") {
        return value
    }

    if (typeof value === "string") {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
    }

    return 0
}

function getDateField(row: unknown, key: string): string {
    if (!row || typeof row !== "object") {
        return new Date().toISOString()
    }

    const value = (row as Record<string, unknown>)[key]
    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof value === "string") {
        return value
    }

    return new Date().toISOString()
}

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const customerId = (req as AuthContextRequest).auth_context?.actor_id

    if (!customerId) {
        return res.status(401).json({
            error: "Unauthorized"
        })
    }

    try {
        const conscienceService = req.scope.resolve("conscienceService") as ConscienceService
        const remoteQuery = req.scope.resolve("remoteQuery") as RemoteQueryService
        const logger = req.scope.resolve("logger") as any

        // 1. Get current cart total
        let currentCartTotal = 0
        try {
            const cartResult = await remoteQuery.graph({
                entity: "cart",
                // audit-ignore: store-tenant-scope — auth-scoped: kimlik-doğrulanmış müşterinin KENDİ cart'ı (customer_id); cross-tenant sızıntı yok
                fields: ["total"],
                filters: { customer_id: customerId }
            })

            const carts = Array.isArray(cartResult.data) ? cartResult.data : []
            if (carts && carts.length > 0) {
                currentCartTotal = getNumberField(carts[0], "total")
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error"
            logger.error(`[Conscience API] Cart fetch failed: ${message}`)
        }

        // 2. Get budget compliance data
        const compliance = await conscienceService.checkBudgetCompliance(
            customerId,
            currentCartTotal,
            "TRY"
        )

        const settings = await conscienceService.listConscienceSettings({
            customer_id: customerId,
        })
        const setting = settings?.[0]
        const limit = Number(setting?.monthly_limit || 0)
        const currentSpending = Number(setting?.current_spending || 0)

        const excessPercentage =
            limit > 0
                ? Math.max(0, ((currentCartTotal - limit) / limit) * 100)
                : 0

        // 3. Calculate budget health score (0-100)
        // Score decreases as excess percentage increases
        let healthScore = 100
        if (excessPercentage > 0) {
            healthScore = Math.max(0, 100 - excessPercentage)
        }

        let status: "healthy" | "warning" | "critical" = "healthy"
        if (excessPercentage > 50) {
            status = "critical"
        } else if (excessPercentage > 30) {
            status = "warning"
        }

        // 4. Get latest warning from ConscienceLog
        const logs = await conscienceService.listConscienceLogs({
            customer_id: customerId
        }, {
            order: { created_at: "DESC" },
            take: 1
        })

        let latestWarning = null
        if (logs.length > 0) {
            const log = logs[0]
            const metadata = log.metadata && typeof log.metadata === "object"
                ? log.metadata
                : {}
            const reasoning = typeof metadata["reasoning"] === "string"
                ? metadata["reasoning"]
                : (compliance.warning || "Bütçe sağlığınızı korumak için sepetinizi optimize etmenizi öneriyoruz.")

            latestWarning = {
                message: log.message || `Sepetiniz limitinizden %${Math.round(excessPercentage)} daha yüksek.`,
                ai_reasoning: reasoning,
                created_at: log.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString()
            }
        }

        // 5. Get spending trend (last 6 months)
        const now = new Date()
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

        const orderResult = await remoteQuery.graph({
            entity: "order",
            // audit-ignore: store-tenant-scope — auth-scoped: müşterinin KENDİ sipariş geçmişi (bütçe analizi); cross-tenant sızıntı yok
            fields: ["total", "created_at"],
            filters: {
                customer_id: customerId,
                created_at: { $gte: sixMonthsAgo }
            }
        })
        const orders = Array.isArray(orderResult.data) ? orderResult.data : []

        // Group by month
        const monthlySpending: { [key: string]: number } = {}
        orders.forEach((order) => {
            const month = new Date(getDateField(order, "created_at")).toLocaleDateString("tr-TR", { month: "long" })
            monthlySpending[month] = (monthlySpending[month] || 0) + getNumberField(order, "total")
        })

        const spendingTrend = Object.entries(monthlySpending).map(([month, amount]) => ({
            month,
            amount
        }))

        // 6. Return dashboard data
        return res.json({
            budget_health: {
                score: Math.round(healthScore),
                status,
                current_spending: currentSpending,
                limit,
                average_spending: limit, // Simplified for now
                excess_percentage: Number(excessPercentage.toFixed(2))
            },
            latest_warning: latestWarning,
            spending_trend: spendingTrend
        })

    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Conscience API] Error: ${message}`)

        return res.status(500).json({
            error: "Failed to fetch conscience data"
        })
    }
}
