import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CONTENT_ENGINE_MODULE } from "../modules/content_engine"

const deletePostStep = createStep(
    "delete-post-step",
    async (id: string, { container }) => {
        const contentModule = container.resolve(CONTENT_ENGINE_MODULE) as any
        await contentModule.deletePosts([id])
        return new StepResponse(id)
    }
    // Delete is usually not reversable in the same way, but could be "soft delete" if needed.
)

export const deletePostWorkflow = createWorkflow(
    "delete-post",
    (id: string) => {
        deletePostStep(id)
        return new WorkflowResponse(id)
    }
)
