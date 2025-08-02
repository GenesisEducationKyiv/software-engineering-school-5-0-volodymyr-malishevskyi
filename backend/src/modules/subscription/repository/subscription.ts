import { PrismaClientInstance, Subscription } from '@/lib/prisma';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { CreateSubscriptionData, ISubscriptionRepository } from '../types/subscription-repository';

@injectable()
export default class SubscriptionRepository implements ISubscriptionRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClientInstance,
  ) {}

  async findByEmail(email: string) {
    return await this.prisma.subscription.findUnique({
      where: { email },
      include: {
        city: true,
      },
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
        city: true,
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
