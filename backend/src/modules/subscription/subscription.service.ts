import { IEmailingService } from '@/common/interfaces/emailing-service';
import { IWeatherApiService } from '@/common/interfaces/weather-api-service';
import crypto from 'crypto';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';
import SubscriptionRepository from './repository/subscription';

const TOKEN_LENGTH = 32;

function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export class SubscriptionService {
  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private weatherApiService: IWeatherApiService,
    private emailingService: IEmailingService,
    private readonly config: { appUrl: string },
  ) {}

  async subscribe(email: string, city: string, frequency: 'daily' | 'hourly'): Promise<void> {
    const existingSubscription = await this.subscriptionRepository.findByEmail(email);

    if (existingSubscription) {
      throw new EmailAlreadySubscribed();
    }

    const cities = await this.weatherApiService.searchCity(city);

    const mostRelevantCity = cities[0];

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

  async unsubscribe(token: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findByRevokeToken(token);

    if (!subscription) {
      throw new TokenNotFound();
    }

    await this.subscriptionRepository.deleteByRevokeToken(token);

    this.emailingService.sendEmail({
      to: subscription.email,
      subject: 'Weather Subscription Successfully Unsubscribed!',
      html: `
        <p>Your subscription successfully unsubscribed!</p>
        <br>
        <p>City: ${subscription.city.fullName}</p>
        <p>Frequency: ${subscription.frequency.toLowerCase()}</p>
        <br>
        <p>You always can <a href="${this.config.appUrl}/api/unsubscribe/${subscription.revokeToken}">Unsubscribe</a></p>
      `,
    });
  }
}
