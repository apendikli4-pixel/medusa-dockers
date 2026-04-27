import { MedusaService } from "@medusajs/framework/utils"
import { Post } from "./models/post"

export default class ContentEngineService extends MedusaService({
    Post,
}) {
    static identifier = "content_engine"
}
