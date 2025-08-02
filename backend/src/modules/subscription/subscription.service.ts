import { IEmailingService } from '@/common/interfaces/emailing-service';
import { IWeatherProvider } from '@/modules/weather/weather-providers/types/weather-provider';
import { CityNotFoundError } from '@/modules/weather/weather-providers/weather-api/errors/weather-api';
import crypto from 'crypto';
import { inject, injectable } from 'tsyringe';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';
import { ISubscriptionRepository } from './types/subscription-repository';

const TOKEN_LENGTH = 32;

function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

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
    @inject('EmailingService')
    private emailingService: IEmailingService,
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

    const confirmationToken = generateToken(TOKEN_LENGTH);
    const revokeToken = generateToken(TOKEN_LENGTH);

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

    this.emailingService.sendEmail({
      to: email,
      subject: 'Weather Subscription Confirmation',
      html: `
        <p>
          You requested a subscription to weather updates.
          Please confirm your subscription by clicking the link: 
          <a href="${this.config.appUrl}/api/confirm/${confirmationToken}">Confirm Subscription</a>
        </p>
        
        <br>
        <p>City: ${subscription.city.fullName}</p>
        <p>Frequency: ${subscription.frequency.toLowerCase()}</p>
        <br>
      `,
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

    this.emailingService.sendEmail({
      to: subscription.email,
      subject: 'Weather Subscription Successfully Confirmed!',
      html: `
        <p>Your subscription successfully confirmed!</p>
        <br>
        <p>City: ${subscription.city.fullName}</p>
        <p>Frequency: ${subscription.frequency.toLowerCase()}</p>
        <br>
        <p>You always can <a href="${this.config.appUrl}/api/unsubscribe/${subscription.revokeToken}">Unsubscribe</a></p>
      `,
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

    this.emailingService.sendEmail({
      to: subscription.email,
      subject: 'Weather Subscription Cancelled',
      html: `
        <p>Your weather subscription has been cancelled.</p>
        <br>
        <p>City: ${subscription.city.fullName}</p>
        <p>Frequency: ${subscription.frequency.toLowerCase()}</p>
        <br>
        <p>You can always subscribe again at any time.</p>
      `,
    });
  }
}
