import { Middleware } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";

/**
 * Middleware to detect and prevent prompt injection attacks
 * Uses the InjectionDetectorService to analyze incoming requests
 */
export const promptSecurityMiddleware: Middleware = async (req, res, next) => {
  try {
    // Get logger from container
    const logger = req.scope.resolve("logger") as Logger;
    
    // Get injection detector service
    const injectionDetector = req.scope.resolve("injectionDetectorService");
    
    // Only apply to routes that might contain user input for AI processing
    // Skip if not a POST/PUT/PATCH request or if body is empty
    if (!["POST", "PUT", "PATCH"].includes(req.method) || !req.body) {
      return next();
    }
    
    // Extract text fields from request body that might contain user input
    const textFields = extractTextFields(req.body);
    
    // Check each text field for injection attempts
    for (const [fieldName, fieldValue] of Object.entries(textFields)) {
      if (typeof fieldValue === "string" && fieldValue.trim().length > 0) {
        const result = injectionDetector.detect(fieldValue);
        
        // If malicious content detected, block the request
        if (result.isMalicious) {
          logger.warn(`[PromptSecurity] Blocked request with prompt injection attempt`, {
            path: req.path,
            method: req.method,
            field: fieldName,
            riskScore: result.riskScore,
            detectedPatterns: result.detectedPatterns,
            input: fieldValue.substring(0, 100) + (fieldValue.length > 100 ? "..." : ""),
            // Try to get user ID and IP for logging
            userId: req.auth_context?.actor_id || "anonymous",
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
          });
          
          // Return 400 Bad Request with generic error message (don't reveal security details)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Invalid request: potential security threat detected"
          );
        }
      }
    }
    
    // If no threats detected, continue with request processing
    return next();
  } catch (error) {
    // If it's already a MedusaError, re-throw it
    if (error instanceof MedusaError) {
      throw error;
    }
    
    // Otherwise, log and return internal server error
    const logger = req.scope.resolve("logger") as Logger;
    logger.error(`[PromptSecurity] Middleware error: ${error.message}`, { error });
    
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "An error occurred while processing the request"
    );
  }
};

/**
 * Recursively extracts all string values from an object
 * @param obj - The object to extract text from
 * @returns Object with field names as keys and string values as values
 */
function extractTextFields(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (obj === null || typeof obj !== "object") {
    return result;
  }
  
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      // Recursively extract from nested objects
      const nested = extractTextFields(value, fullKey);
      Object.assign(result, nested);
    }
    // Ignore other types (numbers, booleans, arrays, etc.)
  }
  
  return result;
}