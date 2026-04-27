import { MedusaApp } from "@medusajs/modules-sdk"
import { ContainerRegistrationKeys } from "@medusajs/utils"
// @ts-ignore
import configModule from "../../medusa-config"
// @ts-ignore
import BrevoNotificationProvider from "../provider"

describe("Brevo Notification Provider Integration", () => {
    it("should initialize the provider successfully", () => {
        const provider = new BrevoNotificationProvider({}, {
            api_key: "test_key",
            from_email: "test@aquahavuz.com",
            from_name: "Test"
        })
        expect(provider).toBeDefined()
        expect(BrevoNotificationProvider.identifier).toBe("brevo")
    })

    it("should mock a send notification flow", async () => {
        const provider = new BrevoNotificationProvider({}, {
            api_key: "test_key",
            from_email: "test@aquahavuz.com",
            from_name: "Test"
        })

        const result = await provider.send({
            to: "admin@aquahavuz.com",
            channel: "email",
            template: "welcome_email",
            data: { username: "TestUser" }
        })

        expect(result).toBeDefined()
    })
})
