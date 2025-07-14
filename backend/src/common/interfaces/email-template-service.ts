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

export interface IEmailTemplateService {
  getSubscriptionConfirmationTemplate(data: SubscriptionConfirmationData): string;
  getSubscriptionConfirmedTemplate(data: SubscriptionConfirmedData): string;
  getSubscriptionCancelledTemplate(data: SubscriptionCancelledData): string;
}
