import { INotificationService } from '@/common/interfaces/notification-service';
import { IWeatherProvider } from '@/common/interfaces/weather-provider';
import { generateConfirmationToken, generateRevokeToken } from '@/common/utils/token-generator';
import { inject, injectable } from 'tsyringe';
import { Subscription } from '../../domain/entities/subscription';
import { EmailAlreadyExistsError } from '../../domain/errors/subscription-domain-errors';
import { ISubscriptionRepository } from '../../domain/interfaces/subscription.repository';
import {
  NotificationFailedError,
  TokenNotFoundError,
  WeatherServiceUnavailableError,
} from '../errors/subscription.service';

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
      throw new EmailAlreadyExistsError(email);
    }

    let mostRelevantCity;
    try {
      const cities = await this.weatherProvider.searchCity(city);
      mostRelevantCity = cities[0];

      if (!mostRelevantCity) {
        throw new WeatherServiceUnavailableError(city);
      }
    } catch (error) {
      if (error instanceof WeatherServiceUnavailableError) {
        throw error;
      }
      throw new WeatherServiceUnavailableError(city, error as Error);
    }

    const confirmationToken = generateConfirmationToken();
    const revokeToken = generateRevokeToken();

    const subscription = await this.subscriptionRepository.save(
      new Subscription({
        email,
        frequency,
        confirmationToken,
        revokeToken,
        isConfirmed: false,
        city: {
          externalId: mostRelevantCity.id,
          name: mostRelevantCity.name,
          region: mostRelevantCity.region,
          country: mostRelevantCity.country,
          latitude: mostRelevantCity.lat,
          longitude: mostRelevantCity.lon,
        },
      }),
    );

    try {
      await this.notificationService.sendSubscriptionConfirmation({
        email,
        confirmationUrl: `${this.config.appUrl}/api/confirm/${confirmationToken}`,
        cityFullName: subscription.city.fullName,
        frequency: subscription.frequency.toLowerCase(),
      });
    } catch (error) {
      throw new NotificationFailedError(email, 'confirmation', error as Error);
    }
  }

  /**
   * Confirm a subscription using the confirmation token
   *
   * @param token - Confirmation token from email
   */
  async confirmSubscription(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByConfirmationToken(token);

    if (!subscription) {
      throw new TokenNotFoundError('confirmation');
    }

    subscription.isConfirmed = true;
    subscription.confirmationToken = null;

    await this.subscriptionRepository.save(subscription);

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
      throw new TokenNotFoundError('confirmation');
    }

    await this.subscriptionRepository.deleteByRevokeToken(token);

    await this.notificationService.sendSubscriptionCancellation({
      email: subscription.email,
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
    });
  }
}
