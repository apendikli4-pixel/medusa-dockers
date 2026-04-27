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

export type CreateMissionStepInput = {
    title: string
    description?: string
    status?: "pending" | "in_progress" | "completed" | "failed"
    priority?: "low" | "medium" | "high" | "critical"
    metadata?: any
}

export const createMissionStep = createStep(
    "create-mission-step",
    async (input: CreateMissionStepInput, { container }) => {
        const service = container.resolve(AYNA_MODULE) as AynaService
        const mission = await service.createMissions(input)
        return new StepResponse(mission, mission.id)
    },
    async (missionId: string | undefined, { container }) => {
        if (!missionId) return
        const service = container.resolve(AYNA_MODULE) as AynaService
        await service.deleteMissions(missionId)
    }
)

export const createMissionWorkflow = createWorkflow(
    "create-mission",
    (input: CreateMissionStepInput) => {
        const mission = createMissionStep(input)
        return new WorkflowResponse(mission)
    }
)
