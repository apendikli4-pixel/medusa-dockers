import { Module } from "@medusajs/framework/utils"
import RmaModuleService from "./service"

export const RMA_MODULE = "rma"

export default Module(RMA_MODULE, {
    service: RmaModuleService,
})
