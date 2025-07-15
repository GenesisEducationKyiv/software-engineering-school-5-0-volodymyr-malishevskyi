import { injectable, inject } from 'tsyringe';
import { IEmailingService } from '../../domain/interfaces/emailing-service';
import { IEmailTemplateService } from '../../domain/interfaces/email-template-service';
import { INotificationService } from '../../domain/interfaces/notification-service';
import type {
  WeatherNotificationData,
  SubscriptionConfirmationData,
  SubscriptionConfirmedData,
  SubscriptionCancellationData,
} from '../../domain/types/email-types';

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject('EmailingService')
    private readonly emailingService: IEmailingService,
    @inject('EmailTemplateService')
    private readonly emailTemplateService: IEmailTemplateService,
  ) {}

  async sendWeatherNotification(data: WeatherNotificationData): Promise<void> {
    const email = this.emailTemplateService.getWeatherUpdateEmail({
      cityFullName: data.cityFullName,
      temperature: data.temperature,
      humidity: data.humidity,
    });

    await this.emailingService.sendEmail({
      to: data.email,
      subject: email.subject,
      html: email.html,
    });
  }

  async sendSubscriptionConfirmation(data: SubscriptionConfirmationData): Promise<void> {
    const email = this.emailTemplateService.getSubscriptionConfirmationEmail({
      confirmationUrl: data.confirmationUrl,
      cityFullName: data.cityFullName,
      frequency: data.frequency,
    });

    await this.emailingService.sendEmail({
      to: data.email,
      subject: email.subject,
      html: email.html,
    });
  }

  async sendSubscriptionConfirmed(data: SubscriptionConfirmedData): Promise<void> {
    const email = this.emailTemplateService.getSubscriptionConfirmedEmail({
      cityFullName: data.cityFullName,
      frequency: data.frequency,
      unsubscribeUrl: data.unsubscribeUrl,
    });

    await this.emailingService.sendEmail({
      to: data.email,
      subject: email.subject,
      html: email.html,
    });
  }

  async sendSubscriptionCancellation(data: SubscriptionCancellationData): Promise<void> {
    const email = this.emailTemplateService.getSubscriptionCancelledEmail({
      cityFullName: data.cityFullName,
      frequency: data.frequency,
    });

    await this.emailingService.sendEmail({
      to: data.email,
      subject: email.subject,
      html: email.html,
    });
  }
}
