import { HttpClient, HttpResponse } from '@/common/http-client'; // Додано HttpResponse
import { City, IWeatherApiService, Weather } from '@/common/interfaces/weather-api-service';
import { CityNotFoundError, WeatherApiError } from './errors/weather-api';
import { CityResponse, ErrorCode, ErrorResponse, WeatherResponse } from './types/weather-api';

const BASE_URL = 'https://api.weatherapi.com';

export interface WeatherApiServiceConfig {
  apiKey: string;
}

export class WeatherApiService implements IWeatherApiService {
  constructor(
    private httpClient: HttpClient,
    private config: WeatherApiServiceConfig,
  ) {}

  async getWeatherByCity(city: string): Promise<Weather> {
    const weatherData = await this.makeApiRequest<WeatherResponse>('/v1/current.json', city);

    const { current, location } = weatherData;

    return {
      city: location.name,
      humidity: current.humidity,
      temperature: {
        c: current.temp_c,
        f: current.temp_f,
      },
      shortDescription: current.condition.text,
    };
  }

  async searchCity(city: string): Promise<City[]> {
    const citiesData = await this.makeApiRequest<CityResponse>('/v1/search.json', city);

    return citiesData as City[];
  }

  private async makeApiRequest<TSuccessResponse>(path: string, cityQuery: string): Promise<TSuccessResponse> {
    const { apiKey } = this.config;

    const response = await this.httpClient.get<TSuccessResponse | ErrorResponse>(`${BASE_URL}${path}`, {
      queryParams: {
        key: apiKey,
        q: cityQuery,
      },
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status !== 200) {
      this.handleApiResponseError(response);
    }

    return response.data as TSuccessResponse;
  }

  private handleApiResponseError(response: HttpResponse<unknown | ErrorResponse>): never {
    const responseContentType = response.headers.get('Content-Type');

    if (!responseContentType?.includes('application/json')) {
      throw new WeatherApiError(
        `Invalid response from Weather API: got ${responseContentType}. Expected application/json.`,
        response.status,
      );
    }

    const errorData = response.data as ErrorResponse;

    if (!errorData || !errorData.error) {
      throw new WeatherApiError(`Invalid error format from Weather API. Status: ${response.status}`, response.status);
    }

    const { error } = errorData;

    if (error.code === ErrorCode.CITY_NOT_FOUND) {
      throw new CityNotFoundError();
    }

    throw new WeatherApiError(error.message || 'Unknown error from Weather API', error.code);
  }
}
