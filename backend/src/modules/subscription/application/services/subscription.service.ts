import {
  IEventBus,
  SubscriptionCancelledEvent,
  SubscriptionConfirmedEvent,
  SubscriptionCreatedEvent,
} from '@/common/events';
import { generateConfirmationToken, generateRevokeToken } from '@/common/utils/token-generator';
import { IWeatherProvider } from '@/modules/subscription/application/interfaces/weather-provider';
import { inject, injectable } from 'tsyringe';
import { Subscription } from '../../domain/entities/subscription';
import { EmailAlreadyExistsError } from '../../domain/errors/subscription-domain-errors';
import { ISubscriptionRepository } from '../../domain/interfaces/subscription.repository';
import { TokenNotFoundError, WeatherServiceUnavailableError } from '../errors/subscription.service';

/**
 * Subscription Service
 *
 * Manages weather subscriptions including creation, confirmation, and cancellation.
 * Uses dependency injection for weather provider, event bus, and configuration.
 * Emits events for subscription lifecycle changes that are consumed by notification module.
 */
@injectable()
export class SubscriptionService {
  constructor(
    @inject('SubscriptionRepository')
    private subscriptionRepository: ISubscriptionRepository,
    @inject('WeatherProvider')
    private weatherProvider: IWeatherProvider,
    @inject('EventBus')
    private eventBus: IEventBus,
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

    let cities;
    try {
      cities = await this.weatherProvider.searchCity(city);
    } catch (error) {
      throw new WeatherServiceUnavailableError(city, error as Error);
    }

    if (!cities || cities.length === 0) {
      throw new WeatherServiceUnavailableError(city, new Error('No cities found'));
    }

    const mostRelevantCity = cities[0];

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

    const event = new SubscriptionCreatedEvent(
      subscription.id?.toString() || 'unknown',
      email,
      subscription.city.fullName,
      subscription.frequency.toLowerCase(),
      `${this.config.appUrl}/api/confirm/${confirmationToken}`,
    );

    await this.eventBus.publish(event);
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

    const event = new SubscriptionConfirmedEvent(
      subscription.id?.toString() || 'unknown',
      subscription.email,
      subscription.city.fullName,
      subscription.frequency.toLowerCase(),
      `${this.config.appUrl}/api/unsubscribe/${subscription.revokeToken}`,
    );

    await this.eventBus.publish(event);
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

    const event = new SubscriptionCancelledEvent(
      subscription.id?.toString() || 'unknown',
      subscription.email,
      subscription.city.fullName,
      subscription.frequency.toLowerCase(),
    );

    await this.eventBus.publish(event);
  }
}
