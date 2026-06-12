import WishlistService from "../service"

describe("WishlistService", () => {
    let service: WishlistService

    const mockListWishlistItems = jest.fn()
    const mockCreateWishlistItems = jest.fn()
    const mockUpdateWishlistItems = jest.fn()
    const mockDeleteWishlistItems = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        service = new (WishlistService as any)({} as any) as any
        
        // Mock the internal MedusaService methods
        (service as any).listWishlistItems = mockListWishlistItems;
        (service as any).createWishlistItems = mockCreateWishlistItems;
        (service as any).updateWishlistItems = mockUpdateWishlistItems;
        (service as any).deleteWishlistItems = mockDeleteWishlistItems;
    })

    describe("upsertWishlistItem", () => {
        it("should create a new item if it doesn't exist", async () => {
            mockListWishlistItems.mockResolvedValueOnce([])
            mockCreateWishlistItems.mockResolvedValueOnce([{ id: "item_1" }])

            const result = await service.upsertWishlistItem({
                customer_id: "cus_1",
                product_id: "prod_1"
            })

            expect(mockListWishlistItems).toHaveBeenCalledWith(
                { customer_id: "cus_1", product_id: "prod_1" },
                { take: 1 }
            )
            expect(mockCreateWishlistItems).toHaveBeenCalledWith({
                customer_id: "cus_1",
                product_id: "prod_1",
                notify_on_restock: true,
                restock_notified_at: null
            })
        })

        it("should update an existing item", async () => {
            mockListWishlistItems.mockResolvedValueOnce([{
                id: "item_existing",
                notify_on_restock: false
            }])
            mockUpdateWishlistItems.mockResolvedValueOnce([{
                id: "item_existing",
                notify_on_restock: true
            }])

            const result = await service.upsertWishlistItem({
                customer_id: "cus_1",
                product_id: "prod_1",
                notify_on_restock: true
            })

            expect(mockUpdateWishlistItems).toHaveBeenCalledWith([{
                id: "item_existing",
                notify_on_restock: true,
                restock_notified_at: null
            }])
            expect(result).toEqual({ id: "item_existing", notify_on_restock: true })
        })
    })

    describe("removeCustomerWishlistItem", () => {
        it("should return false if item does not exist or does not belong to customer (IDOR test)", async () => {
            mockListWishlistItems.mockResolvedValueOnce([])

            const result = await service.removeCustomerWishlistItem("cus_1", "item_1")

            expect(mockListWishlistItems).toHaveBeenCalledWith(
                { id: "item_1", customer_id: "cus_1" },
                { take: 1 }
            )
            expect(result).toBe(false)
            expect(mockDeleteWishlistItems).not.toHaveBeenCalled()
        })

        it("should delete the item if it belongs to customer", async () => {
            mockListWishlistItems.mockResolvedValueOnce([{ id: "item_1" }])

            const result = await service.removeCustomerWishlistItem("cus_1", "item_1")

            expect(mockDeleteWishlistItems).toHaveBeenCalledWith(["item_1"])
            expect(result).toBe(true)
        })
    })
})
