import type {
  WeatherNotificationData,
  SubscriptionConfirmationData,
  SubscriptionConfirmedData,
  SubscriptionCancellationData,
} from '../types/email-types';

export interface INotificationService {
  sendWeatherNotification(data: WeatherNotificationData): Promise<void>;
  sendSubscriptionConfirmation(data: SubscriptionConfirmationData): Promise<void>;
  sendSubscriptionConfirmed(data: SubscriptionConfirmedData): Promise<void>;
  sendSubscriptionCancellation(data: SubscriptionCancellationData): Promise<void>;
}
