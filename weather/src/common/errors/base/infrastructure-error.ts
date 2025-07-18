import { BaseError, ErrorContext } from './base-error';

/**
 * Base class for infrastructure-related errors
 * These errors occur when external systems (databases, APIs, email services) fail
 */
export abstract class InfrastructureError extends BaseError {
  public readonly type = 'infrastructure' as const;
  public readonly retryable: boolean;

  constructor(
    message: string,
    options?: {
      context?: ErrorContext;
      cause?: Error;
      correlationId?: string;
      retryable?: boolean;
    },
  ) {
    super(message, options);
    this.retryable = options?.retryable ?? false;
  }
}
