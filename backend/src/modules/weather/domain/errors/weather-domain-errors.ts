import { DomainError, ErrorContext } from '@/common/errors/base';

/**
 * Weather domain error codes
 */
export const WeatherDomainErrorCodes = {
  INVALID_TEMPERATURE_RANGE: 'WEATHER_INVALID_TEMPERATURE_RANGE',
  INVALID_WEATHER_DATA: 'WEATHER_INVALID_WEATHER_DATA',
} as const;

/**
 * Invalid weather data provided to domain
 */
export class InvalidWeatherDataError extends DomainError {
  readonly code = WeatherDomainErrorCodes.INVALID_WEATHER_DATA;

  constructor(reason: string, context?: ErrorContext) {
    super(`Invalid weather data: ${reason}`, { context });
  }
}

/**
 * Temperature value is outside acceptable domain range
 */
export class InvalidTemperatureRangeError extends DomainError {
  readonly code = WeatherDomainErrorCodes.INVALID_TEMPERATURE_RANGE;

  constructor(temperature: number, context?: ErrorContext) {
    super(`Temperature ${temperature} is outside valid range`, {
      context: { temperature, validRange: { min: -100, max: 100 }, ...context },
    });
  }
}
