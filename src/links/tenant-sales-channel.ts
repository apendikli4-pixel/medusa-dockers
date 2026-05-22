import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
    {
        linkable: {
            serviceName: "tenant",
            field: "tenant",
            entity: "Tenant",
            linkable: "tenant_id",
            primaryKey: "id",
        },
        isList: false,
    },
    {
        linkable: {
            serviceName: "sales_channel",
            field: "sales_channel",
            entity: "SalesChannel",
            linkable: "sales_channel_id",
            primaryKey: "id",
        },
        isList: false,
    }
)
