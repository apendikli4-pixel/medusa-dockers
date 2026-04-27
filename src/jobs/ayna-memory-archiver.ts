import { MedusaContainer } from "@medusajs/framework/types"

export default async function aynaMemoryArchiverJob({ container }: { container: MedusaContainer }) {
    const logger = container.resolve("logger") as any
    const remoteQuery = container.resolve("remoteQuery") as any
    logger.info("[Ayna Memory Archiver] Scheduled memory cleanup started.")

    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Sadece önemi düşük ve eski kayıtları arşivle
        const aynaService = container.resolve("ayna") as any
        const memoryService = aynaService.memoryService_
        
        if (memoryService && memoryService.updateMemoryTruths) {
            const { data } = await remoteQuery.graph({
                entity: "memory_truth",
                fields: ["id"],
                filters: {
                    created_at: { $lt: thirtyDaysAgo.toISOString() },
                    importance: { $lt: 5 },
                    is_archived: false
                }
            })

            if (data && data.length > 0) {
                const idsToArchive = data.map((d: any) => d.id)
                await memoryService.updateMemoryTruths({
                    selector: { id: idsToArchive },
                    data: { is_archived: true }
                })
                logger.info(`[Ayna Memory Archiver] Archived ${idsToArchive.length} obsolete memory truth records.`)
            } else {
                logger.info("[Ayna Memory Archiver] No obsolete records found.")
            }
        }
    } catch (e: any) {
        logger.error(`[Ayna Memory Archiver] Cleanup failed: ${e.message}`)
    }
}

export const config = {
    name: "ayna-memory-archiver",
    schedule: "0 2 * * *", // Her gece saat 02:00'de
}
