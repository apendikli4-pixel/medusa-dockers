import { MedusaService } from "@medusajs/framework/utils"
import { CustomerPoints } from "./models/customer-points"

// 1 TL = 1 Puan, 500 Puan = 50 TL
const POINTS_PER_TL = 1
const REDEMPTION_THRESHOLD = 500
const REDEMPTION_VALUE_TL = 50

export default class LoyaltyService extends MedusaService({
    CustomerPoints,
}) {
    /**
     * Müşterinin mevcut puan bakiyesini hesapla
     */
    async getBalance(customerId: string): Promise<number> {
        const transactions = await this.listCustomerPoints({ customer_id: customerId })
        return transactions.reduce((sum: number, t: any) => {
            if (t.type === "earn" || t.type === "bonus") return sum + t.points
            if (t.type === "redeem" || t.type === "expire") return sum - t.points
            return sum
        }, 0)
    }

    /**
     * Sipariş sonunda puan ver
     */
    async awardOrderPoints(
        customerId: string,
        orderId: string,
        orderTotalTL: number
    ): Promise<number> {
        const earned = Math.floor(orderTotalTL * POINTS_PER_TL)
        if (earned <= 0) return 0

        const currentBalance = await this.getBalance(customerId)
        const newBalance = currentBalance + earned

        await this.createCustomerPoints({
            customer_id: customerId,
            type: "earn",
            points: earned,
            balance_after: newBalance,
            description: `Sipariş #${orderId} için ${earned} puan kazanıldı`,
            order_id: orderId,
        })

        return earned
    }

    /**
     * Puan kullan (bağımsız indirim olarak)
     */
    async redeemPoints(customerId: string, pointsToRedeem: number): Promise<{
        success: boolean
        discountTL?: number
        error?: string
    }> {
        if (pointsToRedeem < REDEMPTION_THRESHOLD) {
            return { success: false, error: `Minimum ${REDEMPTION_THRESHOLD} puan gerekli.` }
        }

        const balance = await this.getBalance(customerId)
        if (balance < pointsToRedeem) {
            return { success: false, error: "Yetersiz puan bakiyesi." }
        }

        const newBalance = balance - pointsToRedeem
        const discountTL = (pointsToRedeem / REDEMPTION_THRESHOLD) * REDEMPTION_VALUE_TL

        await this.createCustomerPoints({
            customer_id: customerId,
            type: "redeem",
            points: pointsToRedeem,
            balance_after: newBalance,
            description: `${pointsToRedeem} puan kullanıldı → ${discountTL} TL indirim`,
            order_id: null,
        })

        return { success: true, discountTL }
    }

    /**
     * İşlem geçmişi
     */
    async getHistory(customerId: string): Promise<any[]> {
        return this.listCustomerPoints(
            { customer_id: customerId },
            { order: { created_at: "DESC" }, take: 50 }
        )
    }

    getRedemptionInfo() {
        return {
            pointsPerTl: POINTS_PER_TL,
            redemptionThreshold: REDEMPTION_THRESHOLD,
            redemptionValueTL: REDEMPTION_VALUE_TL,
        }
    }
}
