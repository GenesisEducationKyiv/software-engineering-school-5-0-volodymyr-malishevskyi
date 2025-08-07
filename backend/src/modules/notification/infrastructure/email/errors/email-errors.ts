import { InfrastructureError, ErrorContext } from '@/common/errors/base';

/**
 * Email infrastructure error codes
 */
export const EmailErrorCodes = {
  DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  SMTP_CONNECTION_FAILED: 'EMAIL_SMTP_CONNECTION_FAILED',
  INVALID_RECIPIENT: 'EMAIL_INVALID_RECIPIENT',
  TEMPLATE_ERROR: 'EMAIL_TEMPLATE_ERROR',
  AUTHENTICATION_FAILED: 'EMAIL_AUTHENTICATION_FAILED',
} as const;

/**
 * Infrastructure-level email delivery error
 * Thrown by EmailingService when SMTP/transport fails
 */
export class EmailDeliveryError extends InfrastructureError {
  readonly code = EmailErrorCodes.DELIVERY_FAILED;

  constructor(message: string, recipient?: string, cause?: Error, context?: ErrorContext) {
    super(`Email delivery failed: ${message}`, {
      context: { recipient, ...context },
      cause,
      retryable: true,
    });
  }
}

/**
 * SMTP connection error
 */
export class SMTPConnectionError extends InfrastructureError {
  readonly code = EmailErrorCodes.SMTP_CONNECTION_FAILED;

  constructor(host: string, cause?: Error, context?: ErrorContext) {
    super(`SMTP connection failed to ${host}`, {
      context: { host, ...context },
      cause,
      retryable: true,
    });
  }
}

/**
 * Invalid email recipient error
 */
export class InvalidRecipientError extends InfrastructureError {
  readonly code = EmailErrorCodes.INVALID_RECIPIENT;

  constructor(recipient: string, context?: ErrorContext) {
    super(`Invalid email recipient: ${recipient}`, {
      context: { recipient, ...context },
      retryable: false,
    });
  }
}
