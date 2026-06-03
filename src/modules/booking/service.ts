import { MedusaService } from "@medusajs/framework/utils"
import { Booking } from "./models/booking"

export default class BookingService extends MedusaService({
    Booking,
}) {
    /**
     * Verilen tarihler arasında çakışan rezervasyon var mı kontrol eder.
     */
    async isAvailable(productId: string, startDate: Date, endDate: Date): Promise<boolean> {
        const overlapping = await this.listBookings({
            product_id: productId,
            status: ["pending", "confirmed"], // İptal edilenler çakışma yaratmaz
            $or: [
                {
                    start_date: { $lt: endDate },
                    end_date: { $gt: startDate }
                }
            ]
        } as any) // Medusa v2 complex filter type workaround

        return overlapping.length === 0
    }

    /**
     * Güvenli rezervasyon oluşturma. Çakışma varsa hata fırlatır.
     */
    async createSafeReservation(data: {
        tenant_id: string
        product_id: string
        start_date: Date
        end_date: Date
        customer_id?: string
        variant_id?: string
    }) {
        const available = await this.isAvailable(data.product_id, data.start_date, data.end_date)
        if (!available) {
            throw new Error("Seçilen tarihler arasında villa zaten dolu.")
        }

        return await this.createBookings(data)
    }
}
