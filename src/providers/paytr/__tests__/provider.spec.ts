const mockFetch = jest.fn()
global.fetch = mockFetch as any

import PayTRProvider from "../provider"

function createMockContainer() {
  return {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  }
}

describe("PayTR Provider", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("forwards Medusa minor-unit amounts to PayTR without multiplying twice", async () => {
    let capturedFormData: URLSearchParams | null = null

    mockFetch.mockImplementation(async (_url: string, options: RequestInit) => {
      capturedFormData = new URLSearchParams(options.body as string)

      return {
        json: async () => ({
          status: "success",
          token: "MOCK_PAYTR_TOKEN",
        }),
      } as any
    })

    const provider = new PayTRProvider(createMockContainer(), {
      merchant_id: "TEST_MERCHANT",
      merchant_key: "TEST_KEY",
      merchant_salt: "TEST_SALT",
    })

    await provider.initiatePayment({
      amount: 10000,
      currency_code: "TRY",
      context: {
        customer: { email: "test@aquahavuz.com" },
      } as any,
    })

    expect((capturedFormData as unknown as URLSearchParams)?.get("payment_amount")).toBe("10000")
    expect((capturedFormData as unknown as URLSearchParams)?.get("user_basket")).toBeTruthy()
  })
})
