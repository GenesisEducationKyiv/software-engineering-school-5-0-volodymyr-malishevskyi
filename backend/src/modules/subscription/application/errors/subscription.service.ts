import { ApplicationError, ErrorContext } from '@/common/errors/base';

/**
 * Subscription service error codes
 */
export const SubscriptionServiceErrorCodes = {
  TOKEN_NOT_FOUND: 'SUBSCRIPTION_TOKEN_NOT_FOUND',
  WEATHER_SERVICE_UNAVAILABLE: 'SUBSCRIPTION_WEATHER_SERVICE_UNAVAILABLE',
  NOTIFICATION_FAILED: 'SUBSCRIPTION_NOTIFICATION_FAILED',
} as const;

/**
 * Token not found in the system
 */
export class TokenNotFoundError extends ApplicationError {
  readonly code = SubscriptionServiceErrorCodes.TOKEN_NOT_FOUND;

  constructor(tokenType: 'confirmation' | 'revoke', context?: ErrorContext) {
    super(`${tokenType} token not found`, {
      context: { tokenType, ...context },
    });
  }
}

/**
 * Weather service is unavailable during subscription process
 */
export class WeatherServiceUnavailableError extends ApplicationError {
  readonly code = SubscriptionServiceErrorCodes.WEATHER_SERVICE_UNAVAILABLE;

  constructor(city: string, cause?: Error, context?: ErrorContext) {
    super(`Weather service unavailable for city: ${city}`, {
      context: { city, ...context },
      cause,
    });
  }
}

/**
 * Notification service failed to send email
 */
export class NotificationFailedError extends ApplicationError {
  readonly code = SubscriptionServiceErrorCodes.NOTIFICATION_FAILED;

  constructor(email: string, notificationType: string, cause?: Error, context?: ErrorContext) {
    super(`Failed to send ${notificationType} notification to ${email}`, {
      context: { email, notificationType, ...context },
      cause,
    });
  }
}
