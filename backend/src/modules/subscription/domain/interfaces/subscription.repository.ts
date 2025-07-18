import { Subscription } from '../entities/subscription';

export interface ISubscriptionRepository {
  findByEmail(email: string): Promise<Subscription | null>;
  findByRevokeToken(revokeToken: string): Promise<Subscription | null>;
  findByConfirmationToken(confirmationToken: string): Promise<Subscription | null>;
  findConfirmedByFrequency(frequency: 'daily' | 'hourly'): Promise<Subscription[]>;
  save(subscription: Subscription): Promise<Subscription>;
  deleteByRevokeToken(revokeToken: string): Promise<Subscription | null>;
}
