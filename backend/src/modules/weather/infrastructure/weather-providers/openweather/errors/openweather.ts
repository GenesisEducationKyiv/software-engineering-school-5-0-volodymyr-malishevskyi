import { InfrastructureError, ErrorContext } from '@/common/errors/base';

/**
 * OpenWeatherMap infrastructure error codes
 */
export const OpenWeatherErrorCodes = {
  API_ERROR: 'OPENWEATHER_API_ERROR',
  CITY_NOT_FOUND: 'OPENWEATHER_CITY_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'OPENWEATHER_RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY: 'OPENWEATHER_INVALID_KEY',
} as const;

/**
 * OpenWeatherMap specific infrastructure error
 */
export class OpenWeatherError extends InfrastructureError {
  readonly code = OpenWeatherErrorCodes.API_ERROR;

  constructor(message: string, apiCode?: number | string, context?: ErrorContext) {
    super(`OpenWeatherMap error: ${message}`, {
      context: { apiCode, ...context },
      retryable: apiCode !== 401 && apiCode !== 'invalid_key',
    });
  }
}

/**
 * OpenWeatherMap specific city not found error
 * Contains OpenWeatherMap specific error code (404)
 */
export class OpenWeatherCityNotFoundError extends InfrastructureError {
  readonly code = OpenWeatherErrorCodes.CITY_NOT_FOUND;

  constructor(city?: string, context?: ErrorContext) {
    super('City not found in OpenWeatherMap', {
      context: { city, apiCode: 404, ...context },
      retryable: false,
    });
  }
}
