import config from './config';
import prisma from './lib/prisma';

import { FetchHttpClient } from './common/http-client';
const httpClient = new FetchHttpClient();

import { WeatherProviderChainFactory } from './modules/weather/weather-providers/chain/weather-provider-chain-factory';
const weatherApiService = WeatherProviderChainFactory.createChain(httpClient, {
  weatherApi: config.weather.providers.weatherApi.apiKey
    ? {
        apiKey: config.weather.providers.weatherApi.apiKey,
        priority: config.weather.providers.weatherApi.priority,
      }
    : undefined,
  openWeather: config.weather.providers.openWeather.apiKey
    ? {
        apiKey: config.weather.providers.openWeather.apiKey,
        priority: config.weather.providers.openWeather.priority,
      }
    : undefined,
});

import { GmailEmailingService } from './common/services/gmail-emailing';
const emailingService = new GmailEmailingService({
  user: config.smtp.user,
  password: config.smtp.password,
  from: config.smtp.from,
});

import { WeatherBroadcastService } from './common/services/weather-broadcast';
const weatherBroadcastService = new WeatherBroadcastService(prisma, weatherApiService, emailingService);

export { emailingService, httpClient, weatherApiService, weatherBroadcastService };
