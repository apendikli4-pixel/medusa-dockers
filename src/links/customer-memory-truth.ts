import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
    {
        linkable: {
            serviceName: "customer",
            field: "customer",
            entity: "Customer",
            linkable: "customer_id",
            primaryKey: "id",
        },
        isList: false,
    },
    {
        linkable: {
            serviceName: "ayna",
            field: "memoryTruth",
            entity: "MemoryTruth",
            linkable: "memory_truth_id",
            primaryKey: "id",
        },
        isList: true,
    }
)
