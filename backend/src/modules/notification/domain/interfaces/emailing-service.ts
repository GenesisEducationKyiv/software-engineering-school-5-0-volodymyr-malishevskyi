import type { EmailOptions } from '../types/email-types';

export interface IEmailingService {
  sendEmail(options: EmailOptions): Promise<void>;
}
