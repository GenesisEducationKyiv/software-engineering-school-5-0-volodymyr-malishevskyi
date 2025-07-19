export type EmailOptions = {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface WeatherNotificationData {
  email: string;
  cityFullName: string;
  temperature: number;
  humidity: number;
  frequency: 'daily' | 'hourly';
}

// Types for notification service (include email)
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

// Types for email template service (template data only)
export interface SubscriptionConfirmationTemplateData {
  confirmationUrl: string;
  cityFullName: string;
  frequency: string;
}

export interface SubscriptionConfirmedTemplateData {
  cityFullName: string;
  frequency: string;
  unsubscribeUrl: string;
}

export interface SubscriptionCancelledTemplateData {
  cityFullName: string;
  frequency: string;
}

export interface WeatherUpdateData {
  cityFullName: string;
  temperature: number;
  humidity: number;
}
