import { IEmailingService } from '@/common/interfaces/emailing-service';
import { IWeatherApiService } from '@/common/interfaces/weather-api-service';
import { PrismaClient } from '@/lib/prisma';
import crypto from 'crypto';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';

const TOKEN_LENGTH = 32;

function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export class SubscriptionService {
  constructor(
    private prisma: PrismaClient,
    private weatherApiService: IWeatherApiService,
    private emailingService: IEmailingService,
    private readonly config: { appUrl: string },
  ) {}

  async subscribe(email: string, city: string, frequency: 'daily' | 'hourly'): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { email },
    });

    if (existingSubscription) {
      throw new EmailAlreadySubscribed();
    }

    const cities = await this.weatherApiService.searchCity(city);

    const mostRelevantCity = cities[0];

    const confirmationToken = generateToken(TOKEN_LENGTH);
    const revokeToken = generateToken(TOKEN_LENGTH);

    const subscription = await this.prisma.subscription.create({
      data: {
        email,
        city: {
          connectOrCreate: {
            where: {
              externalId: mostRelevantCity.id,
            },
            create: {
              externalId: mostRelevantCity.id,
              name: mostRelevantCity.name,
              region: mostRelevantCity.region,
              country: mostRelevantCity.country,
              fullName: [mostRelevantCity.name, mostRelevantCity.region, mostRelevantCity.country].join(', '),
              latitude: mostRelevantCity.lat,
              longitude: mostRelevantCity.lon,
            },
          },
        },
        frequency,
        confirmationToken,
        revokeToken,
        isConfirmed: false,
      },
      include: {
        city: {
          select: {
            fullName: true,
          },
        },
      },
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
    const subscription = await this.prisma.subscription.findUnique({
      where: { confirmationToken: token },
      include: {
        city: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new TokenNotFound();
    }

    await this.prisma.subscription.update({
      where: { confirmationToken: token },
      data: { isConfirmed: true, confirmationToken: null },
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
    const subscription = await this.prisma.subscription.findUnique({
      where: { revokeToken: token },
      include: {
        city: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new TokenNotFound();
    }

    await this.prisma.subscription.delete({
      where: { revokeToken: token },
    });

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
