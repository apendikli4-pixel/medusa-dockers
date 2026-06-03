import { MedusaService } from "@medusajs/framework/utils"
import { Post } from "./models/post"
import { Page } from "./models/page"

export default class ContentEngineService extends MedusaService({
    Post,
    Page,
}) {
    static identifier = "content_engine"
}
