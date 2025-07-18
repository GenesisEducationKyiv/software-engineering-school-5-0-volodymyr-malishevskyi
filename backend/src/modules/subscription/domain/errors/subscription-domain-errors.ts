import { DomainError, ErrorContext } from '@/common/errors/base';

/**
 * Subscription domain error codes
 */
export const SubscriptionDomainErrorCodes = {
  EMAIL_ALREADY_EXISTS: 'SUBSCRIPTION_EMAIL_ALREADY_EXISTS',
  INVALID_EMAIL: 'SUBSCRIPTION_INVALID_EMAIL',
  INVALID_TOKEN: 'SUBSCRIPTION_INVALID_TOKEN',
  ALREADY_CONFIRMED: 'SUBSCRIPTION_ALREADY_CONFIRMED',
  INVALID_FREQUENCY: 'SUBSCRIPTION_INVALID_FREQUENCY',
} as const;

/**
 * Email already exists in the system
 */
export class EmailAlreadyExistsError extends DomainError {
  readonly code = SubscriptionDomainErrorCodes.EMAIL_ALREADY_EXISTS;

  constructor(email: string, context?: ErrorContext) {
    super(`Email ${email} is already subscribed`, {
      context: { email, ...context },
    });
  }
}

/**
 * Invalid email format
 */
export class InvalidEmailError extends DomainError {
  readonly code = SubscriptionDomainErrorCodes.INVALID_EMAIL;

  constructor(email: string, context?: ErrorContext) {
    super(`Invalid email format: ${email}`, {
      context: { email, ...context },
    });
  }
}

/**
 * Subscription token not found or invalid
 */
export class InvalidTokenError extends DomainError {
  readonly code = SubscriptionDomainErrorCodes.INVALID_TOKEN;

  constructor(tokenType: 'confirmation' | 'revoke', context?: ErrorContext) {
    super(`Invalid or expired ${tokenType} token`, {
      context: { tokenType, ...context },
    });
  }
}

/**
 * Subscription already confirmed
 */
export class SubscriptionAlreadyConfirmedError extends DomainError {
  readonly code = SubscriptionDomainErrorCodes.ALREADY_CONFIRMED;

  constructor(context?: ErrorContext) {
    super('Subscription is already confirmed', { context });
  }
}

/**
 * Invalid subscription frequency
 */
export class InvalidFrequencyError extends DomainError {
  readonly code = SubscriptionDomainErrorCodes.INVALID_FREQUENCY;

  constructor(frequency: string, context?: ErrorContext) {
    super(`Invalid subscription frequency: ${frequency}. Must be 'daily' or 'hourly'`, {
      context: { frequency, validFrequencies: ['daily', 'hourly'], ...context },
    });
  }
}
