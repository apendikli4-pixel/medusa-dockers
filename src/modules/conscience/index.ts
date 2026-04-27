import { Module } from "@medusajs/framework/utils"
import ConscienceService from "./service"
import { ConscienceSettings, ConscienceLog } from "./models/conscience"

export const CONSCIENCE_MODULE = "conscience"

export default Module(CONSCIENCE_MODULE, {
    service: ConscienceService,
})

export { ConscienceService }
