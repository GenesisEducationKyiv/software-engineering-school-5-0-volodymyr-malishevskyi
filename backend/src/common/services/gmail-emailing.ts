import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions, IEmailingService } from '../interfaces/emailing-service';
import logger from './logger';

export type GmailEmailingServiceConfig = {
  user: string;
  password: string;
  from: string;
};

export class GmailEmailingService implements IEmailingService {
  private transporter: Transporter;

  constructor(private config: GmailEmailingServiceConfig) {
    const { user, password, from } = config;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass: password,
      },
      from,
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail(options);
      logger.info('Email sent successfully', {
        type: 'external',
        to: options.to,
        subject: options.subject,
        response: info.response,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        type: 'external',
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to send email');
    }
  }
}
