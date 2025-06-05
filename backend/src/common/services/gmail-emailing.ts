import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions, IEmailingService } from '../interfaces/emailing-service';

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
      console.log('Email sent: ' + info.response);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }
}
