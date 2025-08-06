export interface WeatherNotificationData {
  email: string;
  cityFullName: string;
  temperature: number;
  humidity: number;
  frequency: 'daily' | 'hourly';
}

export interface SubscriptionConfirmationData {
  email: string;
  confirmationUrl: string;
  cityFullName: string;
  frequency: string;
}

export interface SubscriptionConfirmedData {
  email: string;
  cityFullName: string;
  frequency: string;
  unsubscribeUrl: string;
}

export interface SubscriptionCancellationData {
  email: string;
  cityFullName: string;
  frequency: string;
}

export interface INotificationService {
  sendWeatherNotification(data: WeatherNotificationData): Promise<void>;
  sendSubscriptionConfirmation(data: SubscriptionConfirmationData): Promise<void>;
  sendSubscriptionConfirmed(data: SubscriptionConfirmedData): Promise<void>;
  sendSubscriptionCancellation(data: SubscriptionCancellationData): Promise<void>;
}
