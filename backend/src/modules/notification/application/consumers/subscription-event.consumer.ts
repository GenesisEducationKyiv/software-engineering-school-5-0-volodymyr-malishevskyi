import {
  EventHandler,
  SubscriptionCancelledEvent,
  SubscriptionConfirmedEvent,
  SubscriptionCreatedEvent,
} from '@/common/events';
import logger from '@/common/logging/logger';
import { inject, injectable } from 'tsyringe';
import { INotificationService } from '../../domain/interfaces/notification-service';

@injectable()
export class SubscriptionEventConsumer {
  constructor(
    @inject('NotificationService')
    private readonly notificationService: INotificationService,
  ) {}

  getSubscriptionCreatedHandler(): EventHandler<SubscriptionCreatedEvent> {
    return new SubscriptionCreatedHandler(this.notificationService);
  }

  getSubscriptionConfirmedHandler(): EventHandler<SubscriptionConfirmedEvent> {
    return new SubscriptionConfirmedHandler(this.notificationService);
  }

  getSubscriptionCancelledHandler(): EventHandler<SubscriptionCancelledEvent> {
    return new SubscriptionCancelledHandler(this.notificationService);
  }
}

class SubscriptionCreatedHandler implements EventHandler<SubscriptionCreatedEvent> {
  constructor(private readonly notificationService: INotificationService) {}

  async handle(event: SubscriptionCreatedEvent): Promise<void> {
    logger.info('Handling subscription created event', {
      eventId: event.eventId,
      subscriptionId: event.aggregateId,
      email: event.email,
    });

    try {
      await this.notificationService.sendSubscriptionConfirmation({
        email: event.email,
        confirmationUrl: event.confirmationUrl,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
      });

      logger.info('Subscription confirmation email sent successfully', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
      });
    } catch (error) {
      logger.error('Failed to send subscription confirmation email', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

class SubscriptionConfirmedHandler implements EventHandler<SubscriptionConfirmedEvent> {
  constructor(private readonly notificationService: INotificationService) {}

  async handle(event: SubscriptionConfirmedEvent): Promise<void> {
    logger.info('Handling subscription confirmed event', {
      eventId: event.eventId,
      subscriptionId: event.aggregateId,
      email: event.email,
    });

    try {
      await this.notificationService.sendSubscriptionConfirmed({
        email: event.email,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
        unsubscribeUrl: event.unsubscribeUrl,
      });

      logger.info('Subscription confirmed email sent successfully', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
      });
    } catch (error) {
      logger.error('Failed to send subscription confirmed email', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

class SubscriptionCancelledHandler implements EventHandler<SubscriptionCancelledEvent> {
  constructor(private readonly notificationService: INotificationService) {}

  async handle(event: SubscriptionCancelledEvent): Promise<void> {
    logger.info('Handling subscription cancelled event', {
      eventId: event.eventId,
      subscriptionId: event.aggregateId,
      email: event.email,
    });

    try {
      await this.notificationService.sendSubscriptionCancellation({
        email: event.email,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
      });

      logger.info('Subscription cancellation email sent successfully', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
      });
    } catch (error) {
      logger.error('Failed to send subscription cancellation email', {
        eventId: event.eventId,
        subscriptionId: event.aggregateId,
        email: event.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
