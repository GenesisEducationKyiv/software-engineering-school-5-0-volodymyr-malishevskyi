import type {
  SubscriptionConfirmationTemplateData,
  SubscriptionConfirmedTemplateData,
  SubscriptionCancelledTemplateData,
  WeatherUpdateData,
  EmailTemplate,
} from '../types/email-types';

export interface IEmailTemplateService {
  getSubscriptionConfirmationEmail(data: SubscriptionConfirmationTemplateData): EmailTemplate;
  getSubscriptionConfirmedEmail(data: SubscriptionConfirmedTemplateData): EmailTemplate;
  getSubscriptionCancelledEmail(data: SubscriptionCancelledTemplateData): EmailTemplate;
  getWeatherUpdateEmail(data: WeatherUpdateData): EmailTemplate;
}
