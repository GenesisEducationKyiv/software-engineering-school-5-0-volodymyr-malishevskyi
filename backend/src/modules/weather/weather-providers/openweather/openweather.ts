import { HttpClient, HttpResponse } from '@/common/http-client';
import { City, IWeatherProvider, Weather } from '@/modules/weather/weather-providers/types/weather-provider';
import { CityNotFoundError, OpenWeatherError } from './errors/openweather';
import { OpenWeatherErrorResponse, OpenWeatherResponse, OpenWeatherSearchResponse } from './types/openweather';

const BASE_URL = 'https://api.openweathermap.org';

export interface OpenWeatherProviderConfig {
  apiKey: string;
}

export class OpenWeatherMapProvider implements IWeatherProvider {
  constructor(
    private httpClient: HttpClient,
    private config: OpenWeatherProviderConfig,
  ) {}

  async getWeatherByCity(city: string): Promise<Weather> {
    const weatherData = await this.makeApiRequest<OpenWeatherResponse>('/data/2.5/weather', {
      q: city,
      units: 'metric',
      appid: this.config.apiKey,
    });

    return {
      city: weatherData.name,
      humidity: weatherData.main.humidity,
      temperature: {
        c: Math.round(weatherData.main.temp),
        f: Math.round((weatherData.main.temp * 9) / 5 + 32),
      },
      shortDescription: weatherData.weather[0].description,
    };
  }

  async searchCity(city: string): Promise<City[]> {
    const citiesData = await this.makeApiRequest<OpenWeatherSearchResponse[]>('/geo/1.0/direct', {
      q: city,
      limit: '5',
      appid: this.config.apiKey,
    });

    return citiesData.map((cityData, index) => ({
      id: index + 1, // OpenWeather doesn't provide unique IDs, so we generate them
      name: cityData.name,
      region: cityData.state || cityData.country,
      country: cityData.country,
      lat: cityData.lat,
      lon: cityData.lon,
      url: `${cityData.name.toLowerCase()}-${cityData.country.toLowerCase()}`,
    }));
  }

  private async makeApiRequest<TSuccessResponse>(
    path: string,
    queryParams: Record<string, string>,
  ): Promise<TSuccessResponse> {
    const response = await this.httpClient.get<TSuccessResponse | OpenWeatherErrorResponse>(`${BASE_URL}${path}`, {
      queryParams,
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status !== 200) {
      this.handleApiResponseError(response);
    }

    return response.data as TSuccessResponse;
  }

  private handleApiResponseError(response: HttpResponse<unknown | OpenWeatherErrorResponse>): never {
    const responseContentType = response.headers.get('Content-Type');

    if (!responseContentType?.includes('application/json')) {
      throw new OpenWeatherError(
        `Invalid response from OpenWeather API: got ${responseContentType}. Expected application/json.`,
        response.status,
      );
    }

    const errorData = response.data as OpenWeatherErrorResponse;

    if (!errorData || !errorData.message) {
      throw new OpenWeatherError(
        `Invalid error format from OpenWeather API. Status: ${response.status}`,
        response.status,
      );
    }

    // OpenWeather returns 404 for city not found
    if (response.status === 404 || errorData.cod === '404') {
      throw new CityNotFoundError();
    }

    throw new OpenWeatherError(errorData.message || 'Unknown error from OpenWeather API', errorData.cod);
  }
}
