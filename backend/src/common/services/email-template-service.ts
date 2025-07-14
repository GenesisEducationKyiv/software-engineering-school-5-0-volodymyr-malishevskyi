import { injectable } from 'tsyringe';
import {
  IEmailTemplateService,
  SubscriptionCancelledData,
  SubscriptionConfirmationData,
  SubscriptionConfirmedData,
} from '../interfaces/email-template-service';

@injectable()
export class EmailTemplateService implements IEmailTemplateService {
  /**
   * Generate HTML template for subscription confirmation email
   */
  getSubscriptionConfirmationTemplate(data: SubscriptionConfirmationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Weather Subscription Confirmation</h2>
        
        <p>You requested a subscription to weather updates.</p>
        <p>Please confirm your subscription by clicking the link below:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${data.confirmationUrl}" 
             style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Confirm Subscription
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Subscription Details:</h3>
          <p style="margin: 5px 0;"><strong>City:</strong> ${data.cityFullName}</p>
          <p style="margin: 5px 0;"><strong>Frequency:</strong> ${data.frequency}</p>
        </div>
        
        <p style="color: #7f8c8d; font-size: 12px;">
          If you didn't request this subscription, you can safely ignore this email.
        </p>
      </div>
    `;
  }

  /**
   * Generate HTML template for subscription confirmed email
   */
  getSubscriptionConfirmedTemplate(data: SubscriptionConfirmedData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Subscription Successfully Confirmed!</h2>
        
        <p>Your weather subscription has been successfully confirmed!</p>
        <p>You will now receive weather updates according to your selected frequency.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Subscription Details:</h3>
          <p style="margin: 5px 0;"><strong>City:</strong> ${data.cityFullName}</p>
          <p style="margin: 5px 0;"><strong>Frequency:</strong> ${data.frequency}</p>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <p>Don't want to receive updates anymore?</p>
          <a href="${data.unsubscribeUrl}" 
             style="background-color: #e74c3c; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 14px;">
            Unsubscribe
          </a>
        </div>
        
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for using our weather subscription service!
        </p>
      </div>
    `;
  }

  /**
   * Generate HTML template for subscription cancelled email
   */
  getSubscriptionCancelledTemplate(data: SubscriptionCancelledData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Weather Subscription Cancelled</h2>
        
        <p>Your weather subscription has been successfully cancelled.</p>
        <p>You will no longer receive weather updates for the selected location.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #2c3e50;">Cancelled Subscription:</h3>
          <p style="margin: 5px 0;"><strong>City:</strong> ${data.cityFullName}</p>
          <p style="margin: 5px 0;"><strong>Frequency:</strong> ${data.frequency}</p>
        </div>
        
        <p>You can always subscribe again at any time by visiting our website.</p>
        
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for using our weather subscription service!
        </p>
      </div>
    `;
  }
}
