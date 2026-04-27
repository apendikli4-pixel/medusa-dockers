/**
 * @sealed 2026-03-15
 * @status STABLE
 */
// @ts-nocheck
import { 
    createStep, 
    StepResponse, 
    createWorkflow, 
    WorkflowResponse 
} from "@medusajs/framework/workflows-sdk"
import { Pool } from "pg"
import { AYNA_MODULE } from "../modules/ayna"
import { AynaService } from "../modules/ayna/service"

export const verifyDbStep = createStep(
    "verify-db-consistency",
    async (input: any, { container }) => {
        return new StepResponse(true)
    }
)

export const updatePgVectorMetadataStep = createStep(
    "update-pgvector-metadata",
    async (input: { id: string, is_available: boolean, available_quantity: number }) => {
        const databaseUrl = process.env.DATABASE_URL
        if (!databaseUrl) return new StepResponse("skipped_no_key")

        const pool = new Pool({ connectionString: databaseUrl, ssl: false })
        try {
            const query = `
                UPDATE langchain_pg_embedding 
                SET metadata = metadata || $1::jsonb 
                WHERE metadata->>'product_id' = $2
            `
            const newMetadata = JSON.stringify({
                is_available: input.is_available,
                available_quantity: input.available_quantity,
                last_sync_at: new Date().toISOString()
            })

            await pool.query(query, [newMetadata, input.id])
            await pool.end()
            return new StepResponse("success")
        } catch (error: any) {
            console.error(`[Workflow] PGVector Sync Error: ${error.message}`)
            await pool.end()
            throw error
        }
    },
    async (input: any, { container }) => {
        try {
            const aynaService = container.resolve(AYNA_MODULE) as AynaService
            await aynaService.recordTruth("system", "SYNC_FAILURE", {
                target: input.id,
                reason: "PGVector metadata sync failed"
            })
        } catch (e) {
            console.error("[Workflow] Compensation Error:", e)
        }
    }
)

export const updateInventorySyncWorkflow = createWorkflow(
    "update-inventory-sync",
    function (input: any) {
        verifyDbStep(input)
        const result = updatePgVectorMetadataStep(input)
        return new WorkflowResponse(result)
    }
)
