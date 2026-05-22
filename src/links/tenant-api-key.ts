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
            serviceName: "api_key",
            field: "api_key",
            entity: "ApiKey",
            linkable: "api_key_id",
            primaryKey: "id",
        },
        isList: false,
    }
)
