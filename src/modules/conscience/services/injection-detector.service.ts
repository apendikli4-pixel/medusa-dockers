import { Logger } from "@medusajs/framework/types";
import { MedusaService } from "@medusajs/framework/utils";

type InjectedDependencies = {
  logger: Logger;
};

export interface InjectionDetectionResult {
  isMalicious: boolean;
  riskScore: number;
  detectedPatterns: string[];
}

export default class InjectionDetectorService extends MedusaService({}) {
  protected logger_: Logger;

  constructor(container: InjectedDependencies) {
    super(container);
    this.logger_ = container.logger;
  }

  /**
   * Detects prompt injection attempts in the input text
   * @param input - The user input to check
   * @returns InjectionDetectionResult with risk assessment
   */
  detect(input: string): InjectionDetectionResult {
    const lowerInput = input.toLowerCase();
    const detectedPatterns: string[] = [];
    let riskScore = 0;

    // Define injection patterns with weights
    const patterns: Array<{ regex: RegExp; weight: number; description: string }> = [
      // Direct instruction override attempts
      { regex: /ignore\s+previous\s+instructions?/i, weight: 25, description: "ignore previous instructions" },
      { regex: /ignore\s+all\s+prior\s+instructions?/i, weight: 25, description: "ignore all prior instructions" },
      { regex: /disregard\s+previous\s+instructions?/i, weight: 25, description: "disregard previous instructions" },
      
      // System prompt exposure attempts
      { regex: /system\s*prompt/i, weight: 20, description: "system prompt" },
      { regex: /reveal\s+system\s*prompt/i, weight: 25, description: "reveal system prompt" },
      { regex: /show\s+me\s+the\s+system\s*prompt/i, weight: 25, description: "show system prompt" },
      { regex: /what\s+is\s+your\s+system\s*prompt/i, weight: 25, description: "what is your system prompt" },
      
      // Role manipulation attempts
      { regex: /role\s*:\s*system/i, weight: 20, description: "role: system" },
      { regex: /you\s+are\s+now/i, weight: 15, description: "you are now" },
      { regex: /pretend\s+to\s+be/i, weight: 15, description: "pretend to be" },
      { regex: /act\s+as\s+if/i, weight: 15, description: "act as if" },
      
      // Jailbreak attempts
      { regex: /jailbreak/i, weight: 20, description: "jailbreak" },
      { regex: /do\s+anything\s+now/i, weight: 20, description: "do anything now" },
      { regex: /dan\s+mode/i, weight: 20, description: "DAN mode" },
      
      // SQL injection attempts
      { regex: /('|")?\s*(union|select|insert|update|delete|drop|create)\s+/i, weight: 15, description: "SQL injection" },
      { regex: /;\s*(drop|delete|insert|update)\s+/i, weight: 20, description: "SQL injection with semicolon" },
      { regex: /'?\s*or\s+'?\s*1\s*=\s*1/i, weight: 15, description: "SQL tautology" },
      
      // Path traversal attempts
      { regex: /\.\.\/|\.\.\\/g, weight: 10, description: "path traversal" },
      { regex: /\/etc\/passwd|\/etc\/shadow/i, weight: 15, description: "system file access" },
      { regex: /\\\\.+\\\\.+\\\\/i, weight: 10, description: "Windows path traversal" },
      
      // Encoding/bypass attempts
      { regex: /data:text\/html/i, weight: 15, description: "data URI injection" },
      { regex: /<\s*script/i, weight: 15, description: "script tag injection" },
      { regex: /javascript:/i, weight: 15, description: "javascript protocol" },
      
      // Repetition/overflow attempts
      { regex: /(.)\1{10,}/, weight: 10, description: "character repetition overflow" },
    ];

    // Check each pattern
    for (const pattern of patterns) {
      if (pattern.regex.test(lowerInput)) {
        detectedPatterns.push(pattern.description);
        riskScore += pattern.weight;
      }
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine if malicious (threshold: 70)
    const isMalicious = riskScore > 70;

    // Log if malicious
    if (isMalicious) {
      this.logger_.warn(`[InjectionDetector] Blocked prompt injection attempt: ${detectedPatterns.join(", ")}`, {
        input: input.substring(0, 100) + (input.length > 100 ? "..." : ""),
        riskScore,
        detectedPatterns
      });
    }

    return {
      isMalicious,
      riskScore,
      detectedPatterns
    };
  }

  /**
   * Checks if input is safe (risk score <= threshold)
   * @param input - The user input to check
   * @param threshold - Risk threshold (default 70)
   * @returns true if safe
   */
  isSafe(input: string, threshold: number = 70): boolean {
    const result = this.detect(input);
    return result.riskScore <= threshold;
  }
}