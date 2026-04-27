import { HybridAIProviderService } from "../services/hybrid-ai.provider"

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}

describe("HybridAIProviderService", () => {
  let service: HybridAIProviderService

  beforeEach(() => {
    // Reset environment variables for each test
    jest.resetModules()
    process.env.GEMINI_API_KEY = "test-gemini-key"
    process.env.OLLAMA_API_URL = "http://ollama:11434"
    process.env.OLLAMA_MODEL_NAME = "llama3"
    process.env.GEMINI_MODEL_NAME = "gemini-1.5-flash"
    
    service = new HybridAIProviderService(mockLogger as any)
  })

  describe("constructor", () => {
    it("should initialize Gemini when API key is provided", () => {
      expect(service["isGeminiAvailable"]()).toBe(true)
    })

    it("should log initialization info", () => {
      expect(mockLogger.info).toHaveBeenCalled()
    })
  })

  describe("shouldFallback", () => {
    it("should return true for 429 status", () => {
      const error = { status: 429 }
      expect(service["shouldFallback"](error)).toBe(true)
    })

    it("should return true for 500 status", () => {
      const error = { status: 500 }
      expect(service["shouldFallback"](error)).toBe(true)
    })

    it("should return true for timeout message", () => {
      const error = { message: "Request timeout" }
      expect(service["shouldFallback"](error)).toBe(true)
    })

    it("should return false for other errors", () => {
      const error = { message: "Some other error" }
      expect(service["shouldFallback"](error)).toBe(false)
    })
  })

  // Note: Actual integration tests would require mocking the fetch API and Gemini API
  // These are unit tests focusing on the service structure and logic
})
