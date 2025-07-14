import { EmailDeliveryError } from '@/common/errors/email-errors';
import { HTTPBadRequestError, HTTPNotFoundError, HTTPInternalServerError } from '@/common/errors/http-error';
import logger from '@/common/logging/logger';
import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { z } from 'zod';
import { EmailAlreadyExistsError } from './domain/errors/subscription-domain-errors';
import { TokenNotFoundError, WeatherServiceUnavailableError, NotificationFailedError } from './application/errors';
import { ISubscriptionService } from './types/subscription-service';

@injectable()
export class SubscriptionController {
  constructor(
    @inject('SubscriptionService')
    private subscriptionService: ISubscriptionService,
  ) {}

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = z
        .object({
          email: z.string().email(),
          city: z.string(),
          frequency: z.enum(['daily', 'hourly']),
        })
        .parse(req.body);

      await this.subscriptionService.subscribe(data.email, data.city, data.frequency);
      res.json({ message: 'Subscription successful. Confirmation email sent.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new HTTPBadRequestError('Invalid request'));
      }
      if (error instanceof EmailAlreadyExistsError) {
        return next(new HTTPBadRequestError('Email already subscribed'));
      }
      if (error instanceof WeatherServiceUnavailableError) {
        logger.error('Weather service unavailable during subscription', {
          type: 'application',
          endpoint: '/api/subscribe',
          city: req.body?.city,
          error: error.message,
          correlationId: error.correlationId,
        });
        return next(new HTTPBadRequestError('City not found or weather service unavailable'));
      }
      if (error instanceof NotificationFailedError) {
        logger.error('Notification failed during subscription', {
          type: 'application',
          endpoint: '/api/subscribe',
          email: req.body?.email,
          error: error.message,
          correlationId: error.correlationId,
        });
        return next(new HTTPInternalServerError('Failed to send confirmation email'));
      }
      if (error instanceof EmailDeliveryError) {
        // SMTP помилки = server error, не client error
        logger.error('Email delivery failed', {
          type: 'system',
          endpoint: '/api/subscribe',
          email: req.body?.email,
          error: error.message,
        });
        return next(error); // 500 Internal Server Error
      }
      next(error);
    }
  }

  async confirmSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = z.string().parse(req.params.token);

      await this.subscriptionService.confirmSubscription(token);
      res.json({ message: 'Subscription confirmed! successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new HTTPBadRequestError('Invalid request'));
      }
      if (error instanceof TokenNotFoundError) {
        return next(new HTTPNotFoundError(error.message));
      }
      if (error instanceof EmailDeliveryError) {
        logger.error('Email delivery failed', {
          type: 'system',
          endpoint: '/api/confirm/:token',
          error: error.message,
        });
        return next(error); // 500 Internal Server Error
      }
      next(error);
    }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = z.string().parse(req.params.token);

      await this.subscriptionService.unsubscribe(token);
      res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new HTTPBadRequestError('Invalid token'));
      }
      if (error instanceof TokenNotFoundError) {
        return next(new HTTPNotFoundError(error.message));
      }
      if (error instanceof EmailDeliveryError) {
        logger.error('Email delivery failed', {
          type: 'system',
          endpoint: '/api/unsubscribe/:token',
          error: error.message,
        });
        return next(error); // 500 Internal Server Error
      }
      next(error);
    }
  }
}
