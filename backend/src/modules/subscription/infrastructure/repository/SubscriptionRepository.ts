import { PrismaClientInstance } from '@/lib/prisma';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { Subscription } from '../../domain/entities/subscription';
import { ISubscriptionRepository } from '../../domain/interfaces/subscription.repository';

@injectable()
export default class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClientInstance,
  ) {}

  async findByEmail(email: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { email },
      include: {
        city: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return new Subscription(subscription);
  }

  async findByConfirmationToken(token: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { confirmationToken: token },
      include: {
        city: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return new Subscription(subscription);
  }

  async findByRevokeToken(token: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { revokeToken: token },
      include: {
        city: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return new Subscription(subscription);
  }

  async save(subscription: Subscription): Promise<Subscription> {
    const cityConnectOrCreate = {
      connectOrCreate: {
        where: {
          externalId: subscription.city.externalId || undefined,
        },
        create: {
          externalId: subscription.city.externalId,
          name: subscription.city.name,
          region: subscription.city.region,
          country: subscription.city.country,
          fullName: subscription.city.fullName,
          latitude: subscription.city.latitude,
          longitude: subscription.city.longitude,
        },
      },
    };

    const subscriptionData = {
      email: subscription.email,
      frequency: subscription.frequency,
      confirmationToken: subscription.confirmationToken,
      revokeToken: subscription.revokeToken,
      isConfirmed: subscription.isConfirmed,
      city: cityConnectOrCreate,
    };

    let savedSubscription;

    if (!subscription.id) {
      // Create new subscription
      savedSubscription = await this.prisma.subscription.create({
        data: subscriptionData,
        include: {
          city: true,
        },
      });
    } else {
      // Update existing subscription
      savedSubscription = await this.prisma.subscription.update({
        where: {
          id: subscription.id,
        },
        data: subscriptionData,
        include: {
          city: true,
        },
      });
    }

    return new Subscription(savedSubscription);
  }

  async findConfirmedByFrequency(frequency: 'daily' | 'hourly'): Promise<Subscription[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        isConfirmed: true,
        frequency,
      },
      include: {
        city: true,
      },
    });

    return subscriptions.map((subscription) => new Subscription(subscription));
  }

  async deleteByRevokeToken(revokeToken: string): Promise<Subscription | null> {
    try {
      const subscription = await this.prisma.subscription.delete({
        where: {
          revokeToken,
        },
        include: {
          city: true,
        },
      });

      return new Subscription(subscription);
    } catch {
      // Record not found
      return null;
    }
  }
}
