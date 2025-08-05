import { injectable, inject } from 'tsyringe';
import { PrismaClientInstance } from '@/lib/prisma';
import { WeatherService } from '@/modules/weather/weather.service';
import { IEmailingService } from '../interfaces/emailing-service';
import delay from '../utils/delay';
import logger from './logger';

@injectable()
export class WeatherBroadcastService {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClientInstance,
    @inject('WeatherService')
    private readonly weatherService: WeatherService,
    @inject('EmailingService')
    private readonly emailingService: IEmailingService,
    @inject('Config')
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
      logger.info('No subscriptions found for the specified frequency', { type: 'business', frequency });
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
      const weather = await this.weatherService.getWeatherByCity(cityFullName);

      const emailContent = `
          <h1>Weather Update for ${cityFullName}</h1>
          <p>Temperature: ${weather.temperature}°C</p>
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
          logger.error(`Failed to send email to ${email}`, {
            type: 'external',
            email,
            city: cityFullName,
            frequency,
            error: e instanceof Error ? e.message : String(e),
          });
        }

        delay(this.config.sendingDelay);
      }
    }
  }
}
