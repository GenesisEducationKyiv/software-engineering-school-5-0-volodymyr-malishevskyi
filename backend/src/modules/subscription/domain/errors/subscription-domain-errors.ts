/**
 * Base domain error for subscription module
 */
export abstract class SubscriptionDomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Email already exists in the system
 */
export class EmailAlreadyExistsError extends SubscriptionDomainError {
  readonly code = 'EMAIL_ALREADY_EXISTS';

  constructor(email: string) {
    super(`Email ${email} is already subscribed`);
  }
}

/**
 * Invalid email format
 */
export class InvalidEmailError extends SubscriptionDomainError {
  readonly code = 'INVALID_EMAIL';

  constructor(email: string) {
    super(`Invalid email format: ${email}`);
  }
}

/**
 * Subscription token not found or invalid
 */
export class InvalidTokenError extends SubscriptionDomainError {
  readonly code = 'INVALID_TOKEN';

  constructor(tokenType: 'confirmation' | 'revoke') {
    super(`Invalid or expired ${tokenType} token`);
  }
}

/**
 * Subscription already confirmed
 */
export class SubscriptionAlreadyConfirmedError extends SubscriptionDomainError {
  readonly code = 'ALREADY_CONFIRMED';

  constructor() {
    super('Subscription is already confirmed');
  }
}

/**
 * City not found in external weather API
 */
export class CityNotFoundError extends SubscriptionDomainError {
  readonly code = 'CITY_NOT_FOUND';

  constructor(cityName: string) {
    super(`City not found: ${cityName}`);
  }
}

/**
 * Invalid subscription frequency
 */
export class InvalidFrequencyError extends SubscriptionDomainError {
  readonly code = 'INVALID_FREQUENCY';

  constructor(frequency: string) {
    super(`Invalid subscription frequency: ${frequency}. Must be 'daily' or 'hourly'`);
  }
}
