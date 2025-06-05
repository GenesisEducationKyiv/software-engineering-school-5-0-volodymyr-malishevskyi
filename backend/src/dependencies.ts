import config from './config';
import prisma from './lib/prisma';

import { FetchHttpClient } from './common/http-client';
const httpClient = new FetchHttpClient();

import { WeatherApiService } from './common/services/weather-api/weather-api';
const weatherApiService = new WeatherApiService(httpClient, config.weather);

import { GmailEmailingService } from './common/services/gmail-emailing';
const emailingService = new GmailEmailingService({
  user: config.smtp.user,
  password: config.smtp.password,
  from: config.smtp.from,
});

import { WeatherBroadcastService } from './common/services/weather-broadcast';
const weatherBroadcastService = new WeatherBroadcastService(prisma, weatherApiService, emailingService);

export { emailingService, httpClient, weatherApiService, weatherBroadcastService };
