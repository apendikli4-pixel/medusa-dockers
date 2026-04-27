/**
 * @sealed 2026-03-15
 * @status STABLE
 */
import { 
    createStep, 
    StepResponse, 
    createWorkflow, 
    WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { AYNA_MODULE } from "../modules/ayna"
import AynaService from "../modules/ayna/service"

export type AutonomousInventoryPlanInput = {
    action: string
    category_name?: string
    [key: string]: any
}

export const recordInventoryPlanStep = createStep(
    "record-inventory-plan-step",
    async (input: AutonomousInventoryPlanInput, { container }) => {
        const aynaService = container.resolve(AYNA_MODULE) as AynaService
        
        // Record to Truth Layer
        const truth = await aynaService.recordTruth("ai-inventory-manager", "PLAN_CREATED", input)
        
        // Create a Mission for tracking
        const mission = await aynaService.createMissions({
            title: `Envanter Planı: ${input.action} - ${input.category_name || 'Genel'}`,
            status: "pending"
        })
        
        return new StepResponse({ truth, mission }, mission.id)
    },
    async (missionId: string | undefined, { container }) => {
        if (!missionId) return
        const aynaService = container.resolve(AYNA_MODULE) as AynaService
        await aynaService.deleteMissions(missionId)
    }
)

export const autonomousInventoryPlanWorkflow = createWorkflow(
    "autonomous-inventory-plan",
    (input: AutonomousInventoryPlanInput) => {
        const result = recordInventoryPlanStep(input)
        return new WorkflowResponse(result)
    }
)
