/**
 * Base email error class
 */
export abstract class EmailError extends Error {
  abstract readonly code: string;
  abstract readonly type: 'infrastructure' | 'business';

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Infrastructure-level email delivery error
 * Thrown by EmailingService when SMTP/transport fails
 */
export class EmailDeliveryError extends EmailError {
  readonly code = 'EMAIL_DELIVERY_FAILED';
  readonly type = 'infrastructure' as const;

  constructor(message: string, cause?: Error) {
    super(`Email delivery failed: ${message}`, cause);
  }
}
