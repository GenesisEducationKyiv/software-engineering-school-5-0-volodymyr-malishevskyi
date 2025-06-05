import { HTTPBadRequestError, HTTPNotFoundError } from '@/common/errors/http-error';
import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';
import { ISubscriptionService } from './types/subscription-service';

export class SubscriptionController {
  constructor(private subscriptionService: ISubscriptionService) {}

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
      if (error instanceof EmailAlreadySubscribed) {
        return next(new HTTPBadRequestError('Email already subscribed'));
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
      if (error instanceof TokenNotFound) {
        return next(new HTTPNotFoundError(error.message));
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
      if (error instanceof TokenNotFound) {
        return next(new HTTPNotFoundError(error.message));
      }
      next(error);
    }
  }
}
