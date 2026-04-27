import { Module } from "@medusajs/framework/utils"
import ContentEngineService from "./service"
import { Post } from "./models/post"

export const CONTENT_ENGINE_MODULE = "content_engine"

export default Module(CONTENT_ENGINE_MODULE, {
    service: ContentEngineService,
})

export { ContentEngineService }
