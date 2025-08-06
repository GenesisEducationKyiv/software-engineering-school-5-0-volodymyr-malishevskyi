import { InfrastructureError, ErrorContext } from '@/common/errors/base';
import { ErrorCode } from '../types/weather-api';

/**
 * WeatherAPI infrastructure error codes
 */
export const WeatherApiErrorCodes = {
  API_ERROR: 'WEATHER_API_ERROR',
  CITY_NOT_FOUND: 'WEATHER_API_CITY_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'WEATHER_API_RATE_LIMIT_EXCEEDED',
  INVALID_API_KEY: 'WEATHER_API_INVALID_KEY',
} as const;

/**
 * WeatherAPI specific infrastructure error
 */
export class WeatherApiError extends InfrastructureError {
  readonly code = WeatherApiErrorCodes.API_ERROR;

  constructor(message: string, apiCode?: number, context?: ErrorContext) {
    super(`WeatherAPI error: ${message}`, {
      context: { apiCode, ...context },
      retryable: apiCode !== ErrorCode.INVALID_API_KEY,
    });
  }
}

/**
 * WeatherAPI specific city not found error
 * Contains WeatherAPI specific error code (1006)
 */
export class WeatherApiCityNotFoundError extends InfrastructureError {
  readonly code = WeatherApiErrorCodes.CITY_NOT_FOUND;

  constructor(city?: string, context?: ErrorContext) {
    super('City not found in WeatherAPI', {
      context: { city, apiCode: ErrorCode.CITY_NOT_FOUND, ...context },
      retryable: false,
    });
  }
}
