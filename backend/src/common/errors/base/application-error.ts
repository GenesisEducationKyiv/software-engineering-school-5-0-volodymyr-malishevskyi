import { BaseError, ErrorContext } from './base-error';

/**
 * Base class for application layer errors
 * These errors occur during service orchestration and workflow coordination
 */
export abstract class ApplicationError extends BaseError {
  public readonly type = 'application' as const;

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
