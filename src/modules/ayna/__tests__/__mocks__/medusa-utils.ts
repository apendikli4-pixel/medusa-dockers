/**
 * @medusajs/framework/utils mock'u
 * Jest moduleNameMapper tarafından kullanılır
 */

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

export class AbstractFulfillmentProviderService<T = any> {
  protected logger_: any
  protected options_: T

  constructor(container?: any, options?: T) {
    this.logger_ = container?.logger ?? noopLogger
    this.options_ = (options ?? {}) as T
  }
}

export class AbstractPaymentProvider<T = any> {
  protected logger_: any
  protected options_: T

  constructor(container?: any, options?: T) {
    this.logger_ = container?.logger ?? noopLogger
    this.options_ = (options ?? {}) as T
  }
}

export class AbstractNotificationProviderService {
  constructor(_container?: any, _options?: any) {}
}

export class MedusaError extends Error {
  static Types = {
    NOT_FOUND: "not_found",
    INVALID_DATA: "invalid_data",
    UNAUTHORIZED: "unauthorized",
    PAYMENT_AUTHORIZATION_ERROR: "payment_authorization_error",
  }

  constructor(type: string, message: string) {
    super(message)
    this.name = "MedusaError"
  }
}

/**
 * BigNumber stub — V2.15 ile lib/money.ts BigNumber kullanmaya başladı.
 * Test ortamında gerçek BigNumber.js'i çekmemek için minimal bir wrapper.
 * Production'da @medusajs/framework/utils gerçek BigNumber'ı sağlar.
 */
export class BigNumber {
  readonly numeric: number

  constructor(input: number | string | bigint | { value: number | string }) {
    let v: number
    if (input === null || input === undefined) {
      v = 0
    } else if (typeof input === "object" && "value" in input) {
      v = Number(input.value)
    } else if (typeof input === "bigint") {
      v = Number(input)
    } else {
      v = Number(input)
    }
    this.numeric = Number.isFinite(v) ? v : NaN
  }
}
