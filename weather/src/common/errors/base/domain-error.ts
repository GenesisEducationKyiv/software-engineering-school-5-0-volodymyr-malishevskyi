import { BaseError, ErrorContext } from './base-error';

/**
 * Base class for domain/business logic errors
 * These errors represent violations of business rules or invalid domain states
 */
export abstract class DomainError extends BaseError {
  public readonly type = 'domain' as const;

  constructor(
    message: string,
    options?: {
      context?: ErrorContext;
      cause?: Error;
      correlationId?: string;
    },
  ) {
    super(message, options);
  }
}
