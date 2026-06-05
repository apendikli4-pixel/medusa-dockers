import AynaToolService from "../services/tool-service"

// Mock ollama-client — AI motoru artık yalnızca açık kaynak Ollama
jest.mock("../../../lib/ollama-client", () => ({
    ollamaGenerate: jest.fn().mockResolvedValue("{}"),
    ollamaEmbed: jest.fn().mockResolvedValue([]),
    ollamaConfigured: jest.fn().mockReturnValue(true),
}))

// Mock ai-config
jest.mock("../../../lib/ai-config", () => ({
    AI_CONFIG: { ollamaModel: "qwen2.5:14b" }
}))

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

const mockMemoryService = {
    recordTruth: jest.fn().mockResolvedValue(undefined),
}

const mockDiagnosticService = {
    runFullAudit: jest.fn(),
    runAutoFix: jest.fn(),
}

const mockStockIntelligenceService = {
    predictStockShortages: jest.fn(),
}

describe("AynaToolService", () => {
    let service: AynaToolService

    beforeEach(() => {
        jest.clearAllMocks()
        process.env.OLLAMA_API_URL = "http://localhost:11434"

        service = new AynaToolService({
            logger: mockLogger as any,
            aynaMemoryService: mockMemoryService as any,
            aynaDiagnosticService: mockDiagnosticService as any,
            aynaStockIntelligenceService: mockStockIntelligenceService as any,
        })
    })

    describe("handleToolCall — admin guard", () => {
        it("should reject manage_inventory for non-admin users", async () => {
            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 1500,
            }, { isAdmin: false })

            expect(result.error).toContain("admin")
        })

        it("should allow manage_inventory for admin users", async () => {
            const mockPricingModule = {
                updatePrices: jest.fn().mockResolvedValue(undefined),
            }
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{
                        variants: [{
                            id: "variant_001",
                            title: "Default",
                            price_set: {
                                id: "pset_001",
                                prices: [{ id: "price_001", amount: 1000, currency_code: "try" }]
                            }
                        }]
                    }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 1500,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
            })

            expect(result.success).toBe(true)
        })
    })

    describe("update_stock", () => {
        it("should update stocked_quantity with the provided value", async () => {
            const mockInventoryService = {
                listInventoryItems: jest.fn().mockResolvedValue([
                    { id: "inv_001", sku: "prod_123", stocked_quantity: 10 }
                ]),
                updateInventoryItems: jest.fn().mockResolvedValue(undefined),
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_stock",
                value: 50,
            }, {
                isAdmin: true,
                inventoryService: mockInventoryService,
            })

            expect(result.success).toBe(true)
            expect(result.action).toBe("update_stock")
            expect(result.newValue).toBe(50)
            expect(mockInventoryService.updateInventoryItems).toHaveBeenCalledWith([{
                id: "inv_001",
                stocked_quantity: 50,
            }])
        })

        it("should return error when no inventory item found", async () => {
            const mockInventoryService = {
                listInventoryItems: jest.fn().mockResolvedValue([]),
                updateInventoryItems: jest.fn(),
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_nonexistent",
                action: "update_stock",
                value: 10,
            }, {
                isAdmin: true,
                inventoryService: mockInventoryService,
            })

            expect(result.error).toContain("Stok kaydı bulunamadı")
            expect(mockInventoryService.updateInventoryItems).not.toHaveBeenCalled()
        })

        it("should record truth after successful stock update", async () => {
            const mockInventoryService = {
                listInventoryItems: jest.fn().mockResolvedValue([{ id: "inv_002", sku: "prod_456" }]),
                updateInventoryItems: jest.fn().mockResolvedValue(undefined),
            }

            await service.handleToolCall("manage_inventory", {
                productId: "prod_456",
                action: "update_stock",
                value: 100,
            }, {
                isAdmin: true,
                inventoryService: mockInventoryService,
                tenantId: "tenant_abc",
            })

            expect(mockMemoryService.recordTruth).toHaveBeenCalledWith("admin", "stock_updated", {
                productId: "prod_456",
                newStockValue: 100,
                tenantId: "tenant_abc",
            })
        })
    })

    describe("update_price", () => {
        it("should update existing TRY price", async () => {
            const mockPricingModule = {
                updatePrices: jest.fn().mockResolvedValue(undefined),
            }
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{
                        variants: [{
                            id: "variant_001",
                            title: "Default",
                            price_set: {
                                id: "pset_001",
                                prices: [
                                    { id: "price_001", amount: 1000, currency_code: "try" },
                                    { id: "price_002", amount: 50, currency_code: "usd" },
                                ]
                            }
                        }]
                    }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 2500,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
            })

            expect(result.success).toBe(true)
            expect(result.action).toBe("update_price")
            expect(result.oldValue).toBe(1000)
            expect(result.newValue).toBe(2500)
            expect(result.currency).toBe("TRY")
            expect(mockPricingModule.updatePrices).toHaveBeenCalledWith([{
                id: "price_001",
                amount: 2500,
            }])
        })

        it("should create TRY price when price_set exists but no TRY price", async () => {
            const mockPricingModule = {
                createPrices: jest.fn().mockResolvedValue(undefined),
            }
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{
                        variants: [{
                            id: "variant_001",
                            title: "Default",
                            price_set: {
                                id: "pset_001",
                                prices: [
                                    { id: "price_002", amount: 50, currency_code: "usd" },
                                ]
                            }
                        }]
                    }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 3000,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
            })

            expect(result.success).toBe(true)
            expect(result.note).toContain("TRY fiyatı eklendi")
            expect(mockPricingModule.createPrices).toHaveBeenCalledWith([{
                price_set_id: "pset_001",
                amount: 3000,
                currency_code: "try",
            }])
        })

        it("should create new price_set when variant has none", async () => {
            const mockPricingModule = {
                createPriceSets: jest.fn().mockResolvedValue([{ id: "pset_new" }]),
            }
            const mockRemoteLink = {
                create: jest.fn().mockResolvedValue(undefined),
            }
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{
                        variants: [{
                            id: "variant_001",
                            title: "Default",
                            price_set: null,
                        }]
                    }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_new",
                action: "update_price",
                value: 500,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
                remoteLink: mockRemoteLink,
            } as any)

            expect(result.success).toBe(true)
            expect(result.note).toContain("Yeni fiyat seti oluşturuldu")
            expect(mockPricingModule.createPriceSets).toHaveBeenCalledWith([{
                prices: [{ amount: 500, currency_code: "try" }],
            }])
            expect(mockRemoteLink.create).toHaveBeenCalled()
        })

        it("should return error when product not found", async () => {
            const mockPricingModule = {}
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({ data: [] })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_nonexistent",
                action: "update_price",
                value: 1000,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
            })

            expect(result.error).toContain("Ürün veya varyant bulunamadı")
        })

        it("should return error when product has no variants", async () => {
            const mockPricingModule = {}
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{ variants: [] }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_no_variants",
                action: "update_price",
                value: 1000,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
            })

            expect(result.error).toContain("Ürün veya varyant bulunamadı")
        })

        it("should return error when pricing service unavailable", async () => {
            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 1000,
            }, {
                isAdmin: true,
                pricingModuleService: undefined,
                remoteQuery: { graph: jest.fn() } as any,
            })

            expect(result.error).toContain("Pricing service unavailable")
        })

        it("should return error when query service unavailable", async () => {
            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 1000,
            }, {
                isAdmin: true,
                pricingModuleService: {},
                remoteQuery: undefined,
            })

            expect(result.error).toContain("Query service unavailable")
        })

        it("should record truth after successful price update", async () => {
            const mockPricingModule = {
                updatePrices: jest.fn().mockResolvedValue(undefined),
            }
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{
                        variants: [{
                            id: "variant_x",
                            title: "Default",
                            price_set: {
                                id: "pset_x",
                                prices: [{ id: "price_x", amount: 800, currency_code: "try" }]
                            }
                        }]
                    }]
                })
            }

            await service.handleToolCall("manage_inventory", {
                productId: "prod_x",
                action: "update_price",
                value: 1200,
            }, {
                isAdmin: true,
                pricingModuleService: mockPricingModule,
                remoteQuery: mockRemoteQuery as any,
                tenantId: "tenant_t1",
            })

            expect(mockMemoryService.recordTruth).toHaveBeenCalledWith("admin", "price_updated", {
                productId: "prod_x",
                variantId: "variant_x",
                oldAmount: 800,
                newAmount: 1200,
                currency: "TRY",
                tenantId: "tenant_t1",
            })
        })
    })

    describe("update_price — tenant ownership", () => {
        it("should block price update if product belongs to different tenant", async () => {
            const mockRemoteQuery = {
                graph: jest.fn().mockResolvedValue({
                    data: [{ tenant: { tenant_id: "tenant_other" } }]
                })
            }

            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "update_price",
                value: 1500,
            }, {
                isAdmin: true,
                pricingModuleService: {},
                remoteQuery: mockRemoteQuery as any,
                tenantId: "tenant_mine",
            })

            expect(result.error).toContain("sizin mağazanıza ait değil")
        })
    })

    describe("unsupported action", () => {
        it("should return error for unknown action", async () => {
            const result = await service.handleToolCall("manage_inventory", {
                productId: "prod_123",
                action: "delete_everything",
                value: 0,
            }, {
                isAdmin: true,
            })

            expect(result.error).toContain("Desteklenmeyen işlem")
        })
    })
})
