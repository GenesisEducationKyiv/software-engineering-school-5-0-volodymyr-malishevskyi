import { randomUUID } from 'crypto';

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ErrorMetadata {
  correlationId: string;
  timestamp: Date;
  context?: ErrorContext;
  cause?: Error;
}

/**
 * Base error class for all application errors
 * Provides correlation ID, timestamp, and context for better debugging
 */
export abstract class BaseError extends Error {
  public readonly correlationId: string;
  public readonly timestamp: Date;
  public readonly context?: ErrorContext;
  public readonly cause?: Error;
  public abstract readonly code: string;
  public abstract readonly type: 'domain' | 'infrastructure' | 'application';

  constructor(
    message: string,
    options?: {
      context?: ErrorContext;
      cause?: Error;
      correlationId?: string;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.correlationId = options?.correlationId || randomUUID();
    this.timestamp = new Date();
    this.context = options?.context;
    this.cause = options?.cause;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get error metadata for logging and monitoring
   */
  getMetadata(): ErrorMetadata {
    return {
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      context: this.context,
      cause: this.cause,
    };
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      type: this.type,
      correlationId: this.correlationId,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}
