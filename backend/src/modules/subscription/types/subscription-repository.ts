export interface Subscription {
  id: number;
  email: string;
  cityId: number;
  frequency: 'hourly' | 'daily';
  confirmationToken: string | null;
  revokeToken: string | null;
  isConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface City {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  externalId: number | null;
  name: string;
  fullName: string;
  region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export interface SubscriptionWithCity extends Subscription {
  city: City;
}

export type CreateSubscriptionData = Omit<
  SubscriptionWithCity,
  'id' | 'createdAt' | 'updatedAt' | 'cityId' | 'city'
> & {
  city: Omit<City, 'id' | 'externalId' | 'createdAt' | 'updatedAt'> & {
    externalId?: number;
  };
};

export interface ISubscriptionRepository {
  findByEmail(email: string): Promise<SubscriptionWithCity | null>;
  findByRevokeToken(token: string): Promise<SubscriptionWithCity | null>;
  findByConfirmationToken(token: string): Promise<SubscriptionWithCity | null>;
  findConfirmedByFrequency(frequency: 'daily' | 'hourly'): Promise<SubscriptionWithCity[]>;
  create(data: CreateSubscriptionData): Promise<SubscriptionWithCity>;
  updateByConfirmationToken(confirmationToken: string, data: Partial<Subscription>): Promise<Subscription>;
  deleteByRevokeToken(token: string): Promise<Subscription>;
}
