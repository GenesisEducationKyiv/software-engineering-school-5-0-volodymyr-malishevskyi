import { PrismaClient } from '@/lib/prisma';

type City = {
  externalId?: number;
  name: string;
  region: string;
  country: string;
  fullName: string;
  latitude?: number;
  longitude?: number;
};

type Subscription = {
  email: string;
  frequency: 'daily' | 'hourly';
  confirmationToken: string | null;
  revokeToken: string | null;
  isConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SubscriptionWithCity = Subscription & {
  city: City;
};

type CreateSubscriptionData = Omit<SubscriptionWithCity, 'createdAt' | 'updatedAt'>;

export default class SubscriptionRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return await this.prisma.subscription.findUnique({
      where: { email },
    });
  }

  async findByConfirmationToken(token: string) {
    return await this.prisma.subscription.findFirst({
      where: { confirmationToken: token },
      include: {
        city: true,
      },
    });
  }

  async findByRevokeToken(token: string) {
    return await this.prisma.subscription.findFirst({
      where: { revokeToken: token },
      include: {
        city: true,
      },
    });
  }

  async create(data: CreateSubscriptionData) {
    return await this.prisma.subscription.create({
      data: {
        email: data.email,
        frequency: data.frequency,
        confirmationToken: data.confirmationToken,
        revokeToken: data.revokeToken,
        isConfirmed: false,
        city: {
          connectOrCreate: {
            where: {
              externalId: data.city.externalId,
            },
            create: {
              ...data.city,
            },
          },
        },
      },
      include: {
        city: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  async updateByConfirmationToken(confirmationToken: string, data: Partial<Subscription>) {
    return await this.prisma.subscription.update({
      where: {
        confirmationToken,
      },
      data,
    });
  }

  async deleteByRevokeToken(revokeToken: string) {
    return await this.prisma.subscription.delete({
      where: {
        revokeToken,
      },
    });
  }
}
