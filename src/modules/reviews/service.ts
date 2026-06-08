import { MedusaService } from "@medusajs/framework/utils"
import { ProductReview } from "./models/review"

export default class ReviewsService extends MedusaService({
    ProductReview,
}) {
    static identifier = "reviews"
}
