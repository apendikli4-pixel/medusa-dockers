/**
 * @medusajs/framework/utils mock'u
 * Jest moduleNameMapper tarafından kullanılır
 */

export class AbstractFulfillmentProviderService<T = any> {
  protected logger_: any
  protected options_: T

  constructor(container: any, options: T) {
    this.logger_ = container.logger || {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    }
    this.options_ = options
  }
}

export class AbstractPaymentProvider<T = any> {
  protected logger_: any
  protected options_: T

  constructor(container: any, options: T) {
    this.logger_ = container.logger || {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    }
    this.options_ = options
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
