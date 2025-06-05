export type EmailOptions = {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export interface IEmailingService {
  sendEmail(options: EmailOptions): Promise<void>;
}
