import { validateEmail } from '@/common/utils/email-validator';
import { City } from './city';

export type SubscriptionFrequency = 'daily' | 'hourly';

export interface SubscriptionData {
  id?: number;
  email: string;
  city: City;
  frequency: SubscriptionFrequency;
  confirmationToken?: string | null;
  revokeToken?: string | null;
  isConfirmed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Subscription {
  public readonly id?: number;
  public readonly email: string;
  public readonly city: City;
  public readonly frequency: SubscriptionFrequency;
  public confirmationToken?: string | null;
  public revokeToken?: string | null;
  public isConfirmed: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(data: SubscriptionData) {
    this.id = data.id;
    this.email = validateEmail(data.email);
    this.city = data.city;
    this.frequency = data.frequency;
    this.confirmationToken = data.confirmationToken;
    this.revokeToken = data.revokeToken;
    this.isConfirmed = data.isConfirmed;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
