import { INotificationService } from '@/common/interfaces/notification-service';
import { generateConfirmationToken, generateRevokeToken } from '@/common/utils/token-generator';
import { IWeatherProvider } from '@/modules/weather/weather-providers/types/weather-provider';
import { CityNotFoundError } from '@/modules/weather/weather-providers/weather-api/errors/weather-api';
import { inject, injectable } from 'tsyringe';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';
import { ISubscriptionRepository } from './types/subscription-repository';

/**
 * Subscription Service
 *
 * Manages weather subscriptions including creation, confirmation, and cancellation.
 * Uses dependency injection for weather provider, email service, and configuration.
 */
@injectable()
export class SubscriptionService {
  constructor(
    @inject('SubscriptionRepository')
    private subscriptionRepository: ISubscriptionRepository,
    @inject('CachedWeatherProvider')
    private weatherProvider: IWeatherProvider,
    @inject('NotificationService')
    private notificationService: INotificationService,
    @inject('Config')
    private readonly config: { appUrl: string },
  ) {}

  /**
   * Subscribe a user to weather updates
   *
   * @param email - User's email address
   * @param city - City name for weather updates
   * @param frequency - Update frequency (daily or hourly)
   */
  async subscribe(email: string, city: string, frequency: 'daily' | 'hourly'): Promise<void> {
    const existingSubscription = await this.subscriptionRepository.findByEmail(email);

    if (existingSubscription) {
      throw new EmailAlreadySubscribed();
    }

    const cities = await this.weatherProvider.searchCity(city);

    const mostRelevantCity = cities[0];

    if (!mostRelevantCity) {
      throw new CityNotFoundError();
    }

    const confirmationToken = generateConfirmationToken();
    const revokeToken = generateRevokeToken();

    const subscription = await this.subscriptionRepository.create({
      email,
      frequency,
      confirmationToken,
      revokeToken,
      city: {
        externalId: mostRelevantCity.id,
        name: mostRelevantCity.name,
        region: mostRelevantCity.region,
        country: mostRelevantCity.country,
        fullName: [mostRelevantCity.name, mostRelevantCity.region, mostRelevantCity.country].join(', '),
        latitude: mostRelevantCity.lat,
        longitude: mostRelevantCity.lon,
      },
      isConfirmed: false,
    });

    await this.notificationService.sendSubscriptionConfirmation({
      email,
      confirmationUrl: `${this.config.appUrl}/api/confirm/${confirmationToken}`,
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
    });
  }

  /**
   * Confirm a subscription using the confirmation token
   *
   * @param token - Confirmation token from email
   */
  async confirmSubscription(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByConfirmationToken(token);

    if (!subscription) {
      throw new TokenNotFound();
    }

    await this.subscriptionRepository.updateByConfirmationToken(token, {
      isConfirmed: true,
      confirmationToken: null,
    });

    await this.notificationService.sendSubscriptionConfirmed({
      email: subscription.email,
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
      unsubscribeUrl: `${this.config.appUrl}/api/unsubscribe/${subscription.revokeToken}`,
    });
  }

  /**
   * Unsubscribe a user using the revoke token
   *
   * @param token - Revoke token from email
   */
  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByRevokeToken(token);

    if (!subscription) {
      throw new TokenNotFound();
    }

    await this.subscriptionRepository.deleteByRevokeToken(token);

    await this.notificationService.sendSubscriptionCancellation({
      email: subscription.email,
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
    });
  }
}
