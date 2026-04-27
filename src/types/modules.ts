/**
 * Module Name Constants
 * Central definition of all custom module names to prevent typos and ensure consistency
 */

export const MODULES = {
    // Core Medusa modules are accessed via @medusajs/framework/utils Modules constant

    // Custom modules
    AYNA: "ayna",
    CONTENT_ENGINE: "content_engine",
    CONSCIENCE: "conscience",
    MANUAL_PAYMENT: "manual",
} as const

// Type-safe module name type
export type CustomModuleName = typeof MODULES[keyof typeof MODULES]
