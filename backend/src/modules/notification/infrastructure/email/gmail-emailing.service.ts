import logger from '@/common/logging/logger';
import nodemailer, { Transporter } from 'nodemailer';
import { inject, injectable } from 'tsyringe';
import { IEmailingService } from '../../domain/interfaces/emailing-service';
import type { EmailOptions } from '../../domain/types/email-types';
import { EmailDeliveryError } from './errors/email-errors';

export type GmailEmailingServiceConfig = {
  user: string;
  password: string;
  from: string;
};

@injectable()
export class GmailEmailingService implements IEmailingService {
  private transporter: Transporter;

  constructor(
    @inject('Config')
    private config: { smtp: GmailEmailingServiceConfig },
  ) {
    const { user, password, from } = config.smtp;
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
        type: 'infrastructure',
        service: 'gmail_smtp',
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
        response: info.response,
      });
    } catch (error) {
      // Infrastructure-level error logging with technical details
      logger.error('SMTP email delivery failed', {
        type: 'infrastructure',
        service: 'gmail_smtp',
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error),
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Throw typed domain error for upper layers
      throw new EmailDeliveryError(
        error instanceof Error ? error.message : 'Unknown SMTP error',
        options.to, // recipient
        error instanceof Error ? error : undefined, // cause
      );
    }
  }
}
