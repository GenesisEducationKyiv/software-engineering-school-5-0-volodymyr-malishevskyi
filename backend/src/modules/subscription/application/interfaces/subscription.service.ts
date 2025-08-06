export interface ISubscriptionService {
  subscribe(email: string, city: string, frequency: 'daily' | 'hourly'): Promise<void>;
  confirmSubscription(token: string): Promise<void>;
  unsubscribe(token: string): Promise<void>;
}
