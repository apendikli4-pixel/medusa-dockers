import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    try {
        const userModule = req.scope.resolve(Modules.USER) as any

        const email = "admin@ayna.com"

        // Check if user exists
        const [users] = await userModule.listAndCountUsers({
            email
        })

        if (users.length === 0) {
            // Create user
            const user = await userModule.createUsers({
                email: email,
                first_name: "Admin",
                last_name: "Ayna"
            })

            return res.json({ message: "Admin user record created. Try logging in or resetting password.", user })
        }

        return res.json({ message: "Admin user already exists.", existingUser: users[0] })
    } catch (error: any) {
        return res.json({ message: "Setup failed", error: error.message })
    }
}
