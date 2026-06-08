import { model } from "@medusajs/framework/utils"

export const ContactMessage = model.define("contact_message", {
    id: model.id().primaryKey(),
    name: model.text(),
    email: model.text(),
    phone: model.text().nullable(),
    subject: model.text().nullable(),
    message: model.text(),
    status: model.enum(["unread", "read", "replied"]).default("unread"),
})
