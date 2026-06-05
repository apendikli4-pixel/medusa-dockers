import { HybridAIProviderService } from "../services/hybrid-ai.provider"

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}

// Gemini tamamen kaldırıldı; AI motoru artık yalnızca açık kaynak Ollama.
describe("HybridAIProviderService (Ollama-only)", () => {
  let service: HybridAIProviderService

  beforeEach(() => {
    jest.resetModules()
    process.env.OLLAMA_API_URL = "http://ollama:11434"
    process.env.OLLAMA_MODEL_NAME = "qwen2.5:14b"
    process.env.OLLAMA_EMBED_MODEL = "nomic-embed-text"

    service = new HybridAIProviderService(mockLogger as any)
  })

  describe("constructor", () => {
    it("should initialize with Ollama config from env", () => {
      expect(service["ollamaBaseUrl"]).toBe("http://ollama:11434")
      expect(service["ollamaModel"]).toBe("qwen2.5:14b")
      expect(service["embedModel"]).toBe("nomic-embed-text")
    })

    it("should log initialization info", () => {
      expect(mockLogger.info).toHaveBeenCalled()
    })
  })

  describe("generateText", () => {
    it("should call Ollama /api/generate and return text with providerUsed=ollama", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "qwen2.5:14b",
          created_at: "now",
          response: "Merhaba",
          done: true,
          prompt_eval_count: 5,
          eval_count: 3,
        }),
      })
      ;(globalThis as any).fetch = fetchMock

      const result = await service.generateText("Selam", { temperature: 0.5, maxTokens: 100 })

      expect(result.providerUsed).toBe("ollama")
      expect(result.text).toBe("Merhaba")
      expect(result.usage?.totalTokens).toBe(8)
      expect(fetchMock).toHaveBeenCalledWith(
        "http://ollama:11434/api/generate",
        expect.objectContaining({ method: "POST" })
      )
    })

    it("should throw a descriptive error when Ollama responds non-ok", async () => {
      ;(globalThis as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      await expect(service.generateText("Selam")).rejects.toThrow(/Ollama yanıt veremedi/)
    })
  })

  describe("generateStructured", () => {
    it("should request JSON format from Ollama", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ model: "qwen2.5:14b", created_at: "now", response: "{}", done: true }),
      })
      ;(globalThis as any).fetch = fetchMock

      await service.generateStructured("Veri ver", { schema: { type: "object" } })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.format).toBe("json")
    })
  })
})
