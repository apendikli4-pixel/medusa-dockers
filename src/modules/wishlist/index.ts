import { Module } from "@medusajs/framework/utils"
import WishlistService from "./service"

export const WISHLIST_MODULE = "wishlist"

export default Module(WISHLIST_MODULE, {
    service: WishlistService,
})

export { WishlistService }
