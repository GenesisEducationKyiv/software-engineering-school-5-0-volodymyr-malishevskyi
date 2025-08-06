import { ISubscriptionRepository } from '@/modules/subscription/domain/interfaces/subscription.repository';
import { IWeatherService } from '@/modules/weather/application/types/weather.service';
import { inject, injectable } from 'tsyringe';
import { IBroadcastService } from '../interfaces/broadcast-service';
import { INotificationService } from '../interfaces/notification-service';
import logger from '../logging/logger';
import delay from '../utils/delay';

@injectable()
export class BroadcastService implements IBroadcastService {
  constructor(
    @inject('SubscriptionRepository')
    private readonly subscriptionRepository: ISubscriptionRepository,
    @inject('WeatherService')
    private readonly weatherService: IWeatherService,
    @inject('NotificationService')
    private readonly notificationService: INotificationService,
    @inject('Config')
    private readonly config: { sendingDelay: number } = { sendingDelay: 1000 },
  ) {}

  async broadcastWeatherUpdates(frequency: 'daily' | 'hourly'): Promise<void> {
    const subscriptions = await this.subscriptionRepository.findConfirmedByFrequency(frequency);

    if (!subscriptions.length) {
      logger.info('No subscriptions found for the specified frequency', {
        type: 'business',
        frequency,
      });
      return;
    }

    const citySubscriptions = this.groupSubscriptionsByCity(subscriptions);

    for (const [cityFullName, emails] of citySubscriptions) {
      try {
        const weather = await this.weatherService.getWeatherByCity(cityFullName);

        for (const email of emails) {
          await this.notificationService.sendWeatherNotification({
            email,
            cityFullName,
            temperature: weather.temperature,
            humidity: weather.humidity,
            frequency,
          });

          await delay(this.config.sendingDelay);
        }
      } catch (error) {
        logger.error(`Failed to send weather broadcast for city ${cityFullName}`, {
          type: 'business',
          city: cityFullName,
          frequency,
          emailCount: emails.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private groupSubscriptionsByCity(
    subscriptions: Array<{
      email: string;
      city: { fullName: string };
      frequency: string;
    }>,
  ): Map<string, string[]> {
    const citySubscriptions = new Map<string, string[]>();

    for (const subscription of subscriptions) {
      const cityFullName = subscription.city.fullName;

      if (!citySubscriptions.has(cityFullName)) {
        citySubscriptions.set(cityFullName, []);
      }

      citySubscriptions.get(cityFullName)?.push(subscription.email);
    }

    return citySubscriptions;
  }
}
