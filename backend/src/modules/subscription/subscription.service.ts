import { IEmailingService } from '@/common/interfaces/emailing-service';
import { IEmailTemplateService } from '@/common/interfaces/email-template-service';
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
    @inject('EmailingService')
    private emailingService: IEmailingService,
    @inject('EmailTemplateService')
    private emailTemplateService: IEmailTemplateService,
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

    const confirmationTemplate = this.emailTemplateService.getSubscriptionConfirmationTemplate({
      confirmationUrl: `${this.config.appUrl}/api/confirm/${confirmationToken}`,
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
    });

    this.emailingService.sendEmail({
      to: email,
      subject: 'Weather Subscription Confirmation',
      html: confirmationTemplate,
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

    const confirmedTemplate = this.emailTemplateService.getSubscriptionConfirmedTemplate({
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
      unsubscribeUrl: `${this.config.appUrl}/api/unsubscribe/${subscription.revokeToken}`,
    });

    this.emailingService.sendEmail({
      to: subscription.email,
      subject: 'Weather Subscription Successfully Confirmed!',
      html: confirmedTemplate,
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

    const cancelledTemplate = this.emailTemplateService.getSubscriptionCancelledTemplate({
      cityFullName: subscription.city.fullName,
      frequency: subscription.frequency.toLowerCase(),
    });

    this.emailingService.sendEmail({
      to: subscription.email,
      subject: 'Weather Subscription Cancelled',
      html: cancelledTemplate,
    });
  }
}
