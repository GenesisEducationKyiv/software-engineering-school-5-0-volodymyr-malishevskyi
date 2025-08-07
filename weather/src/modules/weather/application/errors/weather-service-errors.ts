import { ApplicationError, ErrorContext } from '@/common/errors/base';

/**
 * Weather service error codes
 */
export const WeatherServiceErrorCodes = {
  NO_PROVIDERS_AVAILABLE: 'WEATHER_NO_PROVIDERS_AVAILABLE',
  ALL_PROVIDERS_FAILED: 'WEATHER_ALL_PROVIDERS_FAILED',
} as const;

/**
 * All weather providers are unavailable
 */
export class NoWeatherProvidersAvailableError extends ApplicationError {
  readonly code = WeatherServiceErrorCodes.NO_PROVIDERS_AVAILABLE;

  constructor(context?: ErrorContext) {
    super('No weather providers are currently available', { context });
  }
}

/**
 * All weather providers failed to provide data
 */
export class AllWeatherProvidersFailedError extends ApplicationError {
  readonly code = WeatherServiceErrorCodes.ALL_PROVIDERS_FAILED;

  constructor(city: string, providerErrors: Error[], context?: ErrorContext) {
    super(`All weather providers failed to get weather for city: ${city}`, {
      context: {
        city,
        providerCount: providerErrors.length,
        providerErrors: providerErrors.map((e) => e.message),
        ...context,
      },
    });
  }
}
