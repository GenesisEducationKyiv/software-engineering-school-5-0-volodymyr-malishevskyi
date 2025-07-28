import 'reflect-metadata';

import { SubscriptionEventConsumer } from '@/modules/notification/application/consumers/subscription-event.consumer';
import { INotificationService } from '@/modules/notification/domain/interfaces/notification-service';
import { EventBus } from './event-bus';
import {
  SubscriptionCancelledEvent,
  SubscriptionConfirmedEvent,
  SubscriptionCreatedEvent,
} from './subscription-events';

describe('EventBus Integration Tests', () => {
  let eventBus: EventBus;
  let notificationServiceMock: jest.Mocked<INotificationService>;
  let subscriptionEventConsumer: SubscriptionEventConsumer;

  beforeEach(() => {
    eventBus = new EventBus();

    notificationServiceMock = {
      sendWeatherNotification: jest.fn(),
      sendSubscriptionConfirmation: jest.fn(),
      sendSubscriptionConfirmed: jest.fn(),
      sendSubscriptionCancellation: jest.fn(),
    } as jest.Mocked<INotificationService>;

    subscriptionEventConsumer = new SubscriptionEventConsumer(notificationServiceMock);

    // Register event handlers
    eventBus.subscribe(SubscriptionCreatedEvent.EVENT_TYPE, subscriptionEventConsumer.getSubscriptionCreatedHandler());

    eventBus.subscribe(
      SubscriptionConfirmedEvent.EVENT_TYPE,
      subscriptionEventConsumer.getSubscriptionConfirmedHandler(),
    );

    eventBus.subscribe(
      SubscriptionCancelledEvent.EVENT_TYPE,
      subscriptionEventConsumer.getSubscriptionCancelledHandler(),
    );
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('End-to-End Event Flow', () => {
    it('should handle subscription created event from publishing to notification', async () => {
      const event = new SubscriptionCreatedEvent(
        'sub-integration-123',
        'integration@example.com',
        'Integration City, Test Country',
        'daily',
        'https://example.com/confirm/integration-token',
      );

      await eventBus.publish(event);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledWith({
        email: 'integration@example.com',
        confirmationUrl: 'https://example.com/confirm/integration-token',
        cityFullName: 'Integration City, Test Country',
        frequency: 'daily',
      });
    });

    it('should handle subscription confirmed event from publishing to notification', async () => {
      const event = new SubscriptionConfirmedEvent(
        'sub-confirmed-456',
        'confirmed@example.com',
        'Confirmed City, Test Country',
        'hourly',
        'https://example.com/unsubscribe/confirmed-token',
      );

      await eventBus.publish(event);

      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledWith({
        email: 'confirmed@example.com',
        cityFullName: 'Confirmed City, Test Country',
        frequency: 'hourly',
        unsubscribeUrl: 'https://example.com/unsubscribe/confirmed-token',
      });
    });

    it('should handle subscription cancelled event from publishing to notification', async () => {
      const event = new SubscriptionCancelledEvent(
        'sub-cancelled-789',
        'cancelled@example.com',
        'Cancelled City, Test Country',
        'daily',
      );

      await eventBus.publish(event);

      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledWith({
        email: 'cancelled@example.com',
        cityFullName: 'Cancelled City, Test Country',
        frequency: 'daily',
      });
    });

    it('should handle multiple events in sequence', async () => {
      const createdEvent = new SubscriptionCreatedEvent(
        'sub-multi-1',
        'multi1@example.com',
        'Multi City 1, Test Country',
        'daily',
        'https://example.com/confirm/multi-token-1',
      );

      const confirmedEvent = new SubscriptionConfirmedEvent(
        'sub-multi-2',
        'multi2@example.com',
        'Multi City 2, Test Country',
        'hourly',
        'https://example.com/unsubscribe/multi-token-2',
      );

      const cancelledEvent = new SubscriptionCancelledEvent(
        'sub-multi-3',
        'multi3@example.com',
        'Multi City 3, Test Country',
        'daily',
      );

      await eventBus.publish(createdEvent);
      await eventBus.publish(confirmedEvent);
      await eventBus.publish(cancelledEvent);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledTimes(1);
      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledTimes(1);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledWith({
        email: 'multi1@example.com',
        confirmationUrl: 'https://example.com/confirm/multi-token-1',
        cityFullName: 'Multi City 1, Test Country',
        frequency: 'daily',
      });

      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledWith({
        email: 'multi2@example.com',
        cityFullName: 'Multi City 2, Test Country',
        frequency: 'hourly',
        unsubscribeUrl: 'https://example.com/unsubscribe/multi-token-2',
      });

      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledWith({
        email: 'multi3@example.com',
        cityFullName: 'Multi City 3, Test Country',
        frequency: 'daily',
      });
    });

    it('should handle concurrent events', async () => {
      const events = [
        new SubscriptionCreatedEvent(
          'sub-concurrent-1',
          'concurrent1@example.com',
          'Concurrent City 1, Test Country',
          'daily',
          'https://example.com/confirm/concurrent-token-1',
        ),
        new SubscriptionCreatedEvent(
          'sub-concurrent-2',
          'concurrent2@example.com',
          'Concurrent City 2, Test Country',
          'hourly',
          'https://example.com/confirm/concurrent-token-2',
        ),
        new SubscriptionCreatedEvent(
          'sub-concurrent-3',
          'concurrent3@example.com',
          'Concurrent City 3, Test Country',
          'daily',
          'https://example.com/confirm/concurrent-token-3',
        ),
      ];

      const promises = events.map((event) => eventBus.publish(event));
      await Promise.all(promises);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(3);

      const calls = notificationServiceMock.sendSubscriptionConfirmation.mock.calls;
      const emails = calls.map((call) => call[0].email);

      expect(emails).toContain('concurrent1@example.com');
      expect(emails).toContain('concurrent2@example.com');
      expect(emails).toContain('concurrent3@example.com');
    });

    it('should propagate errors from notification service through event bus', async () => {
      const event = new SubscriptionCreatedEvent(
        'sub-error-test',
        'error-test@example.com',
        'Error Test City, Test Country',
        'daily',
        'https://example.com/confirm/error-token',
      );

      const error = new Error('Notification service error');
      notificationServiceMock.sendSubscriptionConfirmation.mockRejectedValue(error);

      await expect(eventBus.publish(event)).rejects.toThrow('Notification service error');
    });

    it('should handle multiple handlers for same event type', async () => {
      const secondConsumer = new SubscriptionEventConsumer(notificationServiceMock);

      // Register a second handler for the same event type
      eventBus.subscribe(SubscriptionCreatedEvent.EVENT_TYPE, secondConsumer.getSubscriptionCreatedHandler());

      const event = new SubscriptionCreatedEvent(
        'sub-multiple-handlers',
        'multiple@example.com',
        'Multiple City, Test Country',
        'daily',
        'https://example.com/confirm/multiple-token',
      );

      await eventBus.publish(event);

      // Should be called twice (once for each handler)
      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(2);
      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledWith({
        email: 'multiple@example.com',
        confirmationUrl: 'https://example.com/confirm/multiple-token',
        cityFullName: 'Multiple City, Test Country',
        frequency: 'daily',
      });
    });
  });

  describe('Event Properties Validation', () => {
    it('should ensure events have required properties', async () => {
      const event = new SubscriptionCreatedEvent(
        'prop-test-123',
        'props@example.com',
        'Props City, Test Country',
        'hourly',
        'https://example.com/confirm/props-token',
      );

      // Verify event properties before publishing
      expect(event.eventId).toBeDefined();
      expect(event.eventType).toBe(SubscriptionCreatedEvent.EVENT_TYPE);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.aggregateId).toBe('prop-test-123');
      expect(event.email).toBe('props@example.com');
      expect(event.cityFullName).toBe('Props City, Test Country');
      expect(event.frequency).toBe('hourly');
      expect(event.confirmationUrl).toBe('https://example.com/confirm/props-token');

      await eventBus.publish(event);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(1);
    });

    it('should maintain event immutability', async () => {
      const event = new SubscriptionCreatedEvent(
        'immutable-test',
        'immutable@example.com',
        'Immutable City, Test Country',
        'daily',
        'https://example.com/confirm/immutable-token',
      );

      const originalEventId = event.eventId;
      const originalTimestamp = event.timestamp;
      const originalEmail = event.email;

      await eventBus.publish(event);

      // Event properties should remain unchanged after publishing
      expect(event.eventId).toBe(originalEventId);
      expect(event.timestamp).toBe(originalTimestamp);
      expect(event.email).toBe(originalEmail);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid event publishing without dropping events', async () => {
      const eventCount = 50;
      const events = Array.from(
        { length: eventCount },
        (_, index) =>
          new SubscriptionCreatedEvent(
            `sub-rapid-${index}`,
            `rapid${index}@example.com`,
            `Rapid City ${index}, Test Country`,
            'daily',
            `https://example.com/confirm/rapid-token-${index}`,
          ),
      );

      const promises = events.map((event) => eventBus.publish(event));
      await Promise.all(promises);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledTimes(eventCount);
    });

    it('should maintain order when events are published sequentially', async () => {
      const emailOrder: string[] = [];

      notificationServiceMock.sendSubscriptionConfirmation.mockImplementation(async (data) => {
        emailOrder.push(data.email);
      });

      const events = [
        new SubscriptionCreatedEvent('sub-order-1', 'order1@example.com', 'City 1', 'daily', 'url1'),
        new SubscriptionCreatedEvent('sub-order-2', 'order2@example.com', 'City 2', 'daily', 'url2'),
        new SubscriptionCreatedEvent('sub-order-3', 'order3@example.com', 'City 3', 'daily', 'url3'),
      ];

      for (const event of events) {
        await eventBus.publish(event);
      }

      expect(emailOrder).toEqual(['order1@example.com', 'order2@example.com', 'order3@example.com']);
    });
  });
});
