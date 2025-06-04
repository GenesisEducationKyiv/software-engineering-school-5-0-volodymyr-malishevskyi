import { PrismaClient } from '@/lib/prisma';
import { IEmailingService } from '../interfaces/emailing-service';
import { IWeatherApiService } from '../interfaces/weather-api-service';
import delay from '../utils/delay';

export class WeatherBroadcastService {
  constructor(
    private prisma: PrismaClient,
    private readonly weatherApiService: IWeatherApiService,
    private readonly emailingService: IEmailingService,
    private readonly config: { sendingDelay: number } = { sendingDelay: 1000 },
  ) {}

  async broadcast(frequency: 'daily' | 'hourly'): Promise<void> {
    const subscriptions = await this.prisma.subscription.findMany({
      select: {
        email: true,
        city: true,
        frequency: true,
      },
      where: {
        isConfirmed: true,
        frequency,
      },
    });

    if (!subscriptions.length) {
      console.log('No subscriptions found for the specified frequency.');
      return;
    }

    const citySubscriptions = new Map<string, string[]>();

    for (const subscription of subscriptions) {
      const cityFullName = subscription.city.fullName;

      if (!citySubscriptions.has(cityFullName)) {
        citySubscriptions.set(cityFullName, []);
      }

      citySubscriptions.get(cityFullName)?.push(subscription.email);
    }

    for (const [cityFullName, emails] of citySubscriptions) {
      const weather = await this.weatherApiService.getWeatherByCity(cityFullName);

      const emailContent = `
          <h1>Weather Update for ${cityFullName}</h1>
          <p>Temperature: ${weather.temperature.c}°C</p>
          <p>Humidity: ${weather.humidity}%</p>
        `;

      for (const email of emails) {
        try {
          await this.emailingService.sendEmail({
            to: email,
            subject: `Weather Update for ${cityFullName}`,
            html: emailContent,
          });
        } catch (e) {
          console.error(`Failed to send email to ${email}:`, e);
        }

        delay(this.config.sendingDelay);
      }
    }
  }
}
