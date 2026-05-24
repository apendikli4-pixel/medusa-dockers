import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import AynaService from "../../../modules/ayna/service"
import { z } from "@medusajs/framework/zod"

const CreateMissionSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    result: z.record(z.string(), z.unknown()).nullable().optional(),
})

const UpdateMissionSchema = z.object({
    missionId: z.string().min(1),
    status: z.enum(["pending", "in_progress", "completed", "failed"]),
})

const MissionPostSchema = z.union([CreateMissionSchema, UpdateMissionSchema])

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const aynaService: AynaService = req.scope.resolve("ayna")
    
    try {
        const [missions, count] = await aynaService.listAndCountMissions({}, {
            order: { created_at: "DESC" }
        })

        res.json({ missions, count })
    } catch (error: unknown) {
        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Admin Missions GET] ${message}`)
        res.status(500).json({ error: "Internal server error" })
    }
}

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const aynaService: AynaService = req.scope.resolve("ayna")

    try {
        const body = MissionPostSchema.parse(req.body)

        if (!("missionId" in body)) {
            const newMission = await aynaService.createMissions({
                title: body.title,
                description: body.description,
                status: body.status || "pending",
                priority: body.priority || "medium",
                result: body.result ?? null,
            })
            return res.json({ mission: newMission })
        }

        const { missionId, status } = body
        let mission
        
        if (status === "completed") {
            const inventoryService = req.scope.resolve(Modules.INVENTORY)
            const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)
            const promotionModule = req.scope.resolve(Modules.PROMOTION)
            let cartModuleService: any
            try { 
                cartModuleService = req.scope.resolve(Modules.CART) 
            } catch (e) {
                // Cart module might not be available
            }

            mission = await aynaService.executeMission(missionId, {
                inventoryService,
                stockLocationService,
                promotionModule,
                cartModuleService,
            })
        } else {
            mission = await aynaService.updateMissions({
                selector: { id: missionId },
                data: { status: status }
            })
        }
        res.json({ mission })
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Geçersiz istek",
                details: error.issues,
            })
        }

        const logger = req.scope.resolve("logger") as any
        const message = error instanceof Error ? error.message : "Unknown error"
        logger.error(`[Admin Missions POST] ${message}`)
        res.status(500).json({ error: "Internal server error" })
    }
}
