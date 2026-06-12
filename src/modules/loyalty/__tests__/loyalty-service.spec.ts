import LoyaltyService from "../service"

describe("LoyaltyService", () => {
    let service: LoyaltyService

    const mockListCustomerPoints = jest.fn()
    const mockCreateCustomerPoints = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()

        service = new (LoyaltyService as any)({} as any) as any
        
        (service as any).listCustomerPoints = mockListCustomerPoints;
        (service as any).createCustomerPoints = mockCreateCustomerPoints;
    })

    describe("getBalance", () => {
        it("should calculate correct balance from history", async () => {
            mockListCustomerPoints.mockResolvedValueOnce([
                { type: "earn", points: 200 },
                { type: "bonus", points: 100 },
                { type: "redeem", points: 50 },
                { type: "expire", points: 10 },
            ])

            const balance = await service.getBalance("cus_1")
            // (200 + 100) - (50 + 10) = 240
            expect(balance).toBe(240)
            expect(mockListCustomerPoints).toHaveBeenCalledWith({ customer_id: "cus_1" })
        })

        it("should return 0 if no history", async () => {
            mockListCustomerPoints.mockResolvedValueOnce([])

            const balance = await service.getBalance("cus_1")
            expect(balance).toBe(0)
        })
    })

    describe("awardOrderPoints", () => {
        it("should correctly award points based on order total", async () => {
            mockListCustomerPoints.mockResolvedValueOnce([{ type: "earn", points: 100 }])
            mockCreateCustomerPoints.mockResolvedValueOnce({ id: "pt_1" })

            const earned = await service.awardOrderPoints("cus_1", "order_1", 250)

            expect(earned).toBe(250) // 250 TL = 250 points
            expect(mockCreateCustomerPoints).toHaveBeenCalledWith(expect.objectContaining({
                customer_id: "cus_1",
                type: "earn",
                points: 250,
                balance_after: 350, // 100 existing + 250 earned
                order_id: "order_1"
            }))
        })

        it("should return 0 if order total is 0", async () => {
            const earned = await service.awardOrderPoints("cus_1", "order_1", 0)
            expect(earned).toBe(0)
            expect(mockCreateCustomerPoints).not.toHaveBeenCalled()
        })
    })

    describe("redeemPoints", () => {
        it("should fail if points to redeem is less than threshold", async () => {
            const result = await service.redeemPoints("cus_1", 100)
            
            expect(result.success).toBe(false)
            expect(result.error).toContain("Minimum 500")
            expect(mockCreateCustomerPoints).not.toHaveBeenCalled()
        })

        it("should fail if balance is insufficient", async () => {
            mockListCustomerPoints.mockResolvedValueOnce([{ type: "earn", points: 600 }])

            const result = await service.redeemPoints("cus_1", 700)
            
            expect(result.success).toBe(false)
            expect(result.error).toContain("Yetersiz")
            expect(mockCreateCustomerPoints).not.toHaveBeenCalled()
        })

        it("should succeed and calculate correct discount if valid", async () => {
            mockListCustomerPoints.mockResolvedValueOnce([{ type: "earn", points: 1000 }])
            mockCreateCustomerPoints.mockResolvedValueOnce({ id: "pt_2" })

            const result = await service.redeemPoints("cus_1", 500)
            
            expect(result.success).toBe(true)
            expect(result.discountTL).toBe(50) // 500 points = 50 TL
            expect(mockCreateCustomerPoints).toHaveBeenCalledWith(expect.objectContaining({
                customer_id: "cus_1",
                type: "redeem",
                points: 500,
                balance_after: 500
            }))
        })
    })
})
