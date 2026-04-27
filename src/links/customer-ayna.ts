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
            field: "memoryInsight",
            entity: "MemoryInsight",
            linkable: "memory_insight_id",
            primaryKey: "id",
        },
        isList: true,
    }
)
