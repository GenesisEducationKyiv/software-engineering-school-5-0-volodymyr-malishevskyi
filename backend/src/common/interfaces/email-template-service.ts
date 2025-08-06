export interface SubscriptionConfirmationData {
  confirmationUrl: string;
  cityFullName: string;
  frequency: string;
}

export interface SubscriptionConfirmedData {
  cityFullName: string;
  frequency: string;
  unsubscribeUrl: string;
}

export interface SubscriptionCancelledData {
  cityFullName: string;
  frequency: string;
}

export interface WeatherUpdateData {
  cityFullName: string;
  temperature: number;
  humidity: number;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface IEmailTemplateService {
  getSubscriptionConfirmationEmail(data: SubscriptionConfirmationData): EmailTemplate;
  getSubscriptionConfirmedEmail(data: SubscriptionConfirmedData): EmailTemplate;
  getSubscriptionCancelledEmail(data: SubscriptionCancelledData): EmailTemplate;
  getWeatherUpdateEmail(data: WeatherUpdateData): EmailTemplate;
}
