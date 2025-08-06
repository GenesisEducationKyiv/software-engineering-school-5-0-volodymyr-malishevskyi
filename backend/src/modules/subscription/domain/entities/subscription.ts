import { City, CityData } from './city';

export type SubscriptionFrequency = 'daily' | 'hourly';

export interface SubscriptionData {
  id?: number;
  email: string;
  city: City | CityData;
  frequency: SubscriptionFrequency;
  confirmationToken: string | null;
  revokeToken: string | null;
  isConfirmed: boolean;
  createdAt?: Date | null | undefined;
  updatedAt?: Date | null | undefined;
}

export class Subscription {
  public readonly id: number | null;
  public readonly email: string;
  public readonly city: City;
  public readonly cityId: number | null;
  public readonly frequency: SubscriptionFrequency;
  public confirmationToken: string | null;
  public revokeToken: string | null;
  public isConfirmed: boolean;
  public readonly createdAt: Date | null;
  public readonly updatedAt: Date | null;

  constructor(data: SubscriptionData) {
    this.id = data.id ?? null;
    this.email = data.email;
    this.city = data.city instanceof City ? data.city : new City(data.city);
    this.cityId = this.city.id;
    this.frequency = data.frequency;
    this.confirmationToken = data.confirmationToken;
    this.revokeToken = data.revokeToken;
    this.isConfirmed = data.isConfirmed;
    this.createdAt = data.createdAt ?? null;
    this.updatedAt = data.updatedAt ?? null;
  }
}
