import { Logger } from "@medusajs/framework/types";
import { MedusaService } from "@medusajs/framework/utils";
import { detectInjection, InjectionDetectionResult } from "./injection-detector.patterns";

type InjectedDependencies = {
    logger: Logger;
};

export type { InjectionDetectionResult } from "./injection-detector.patterns";
export { detectInjection } from "./injection-detector.patterns";

export default class InjectionDetectorService extends MedusaService({}) {
    protected logger_: Logger;

    constructor(container: InjectedDependencies) {
        super(container);
        this.logger_ = container.logger;
    }

    /**
     * Detects prompt injection attempts in the input text and logs malicious ones.
     */
    detect(input: string): InjectionDetectionResult {
        const result = detectInjection(input);
        if (result.isMalicious) {
            this.logger_.warn(
                `[InjectionDetector] Blocked prompt injection attempt: ${result.detectedPatterns.join(", ")}`,
                {
                    input: input.substring(0, 100) + (input.length > 100 ? "..." : ""),
                    riskScore: result.riskScore,
                    detectedPatterns: result.detectedPatterns,
                }
            );
        }
        return result;
    }

    isSafe(input: string, threshold: number = 70): boolean {
        return this.detect(input).riskScore <= threshold;
    }
}
