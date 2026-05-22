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
            serviceName: "stock_location",
            field: "stock_location",
            entity: "StockLocation",
            linkable: "stock_location_id",
            primaryKey: "id",
        },
        isList: false,
    }
)
