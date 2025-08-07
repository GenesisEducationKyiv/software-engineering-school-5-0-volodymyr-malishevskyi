import 'reflect-metadata';
import { SubscriptionCreatedEvent, SubscriptionConfirmedEvent, SubscriptionCancelledEvent } from '@/common/events';
import { INotificationService } from '../../domain/interfaces/notification-service';
import { SubscriptionEventConsumer } from './subscription-event.consumer';

describe('SubscriptionEventConsumer', () => {
  let notificationServiceMock: jest.Mocked<INotificationService>;
  let consumer: SubscriptionEventConsumer;

  beforeEach(() => {
    notificationServiceMock = {
      sendWeatherNotification: jest.fn(),
      sendSubscriptionConfirmation: jest.fn(),
      sendSubscriptionConfirmed: jest.fn(),
      sendSubscriptionCancellation: jest.fn(),
    } as jest.Mocked<INotificationService>;

    consumer = new SubscriptionEventConsumer(notificationServiceMock);
  });

  describe('SubscriptionCreatedHandler', () => {
    it('should handle subscription created event successfully', async () => {
      const event = new SubscriptionCreatedEvent(
        'sub-123',
        'test@example.com',
        'Kyiv, Ukraine',
        'daily',
        'https://example.com/confirm/token123',
      );

      const handler = consumer.getSubscriptionCreatedHandler();
      await handler.handle(event);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledWith({
        email: event.email,
        confirmationUrl: event.confirmationUrl,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
      });
    });

    it('should propagate error when notification service fails', async () => {
      const event = new SubscriptionCreatedEvent(
        'sub-123',
        'test@example.com',
        'Kyiv, Ukraine',
        'daily',
        'https://example.com/confirm/token123',
      );
      const error = new Error('Email service failed');
      notificationServiceMock.sendSubscriptionConfirmation.mockRejectedValue(error);

      const handler = consumer.getSubscriptionCreatedHandler();

      await expect(handler.handle(event)).rejects.toThrow('Email service failed');
    });

    it('should handle different frequency values correctly', async () => {
      const hourlyEvent = new SubscriptionCreatedEvent(
        'sub-456',
        'hourly@example.com',
        'London, UK',
        'hourly',
        'https://example.com/confirm/token456',
      );

      const handler = consumer.getSubscriptionCreatedHandler();
      await handler.handle(hourlyEvent);

      expect(notificationServiceMock.sendSubscriptionConfirmation).toHaveBeenCalledWith({
        email: 'hourly@example.com',
        confirmationUrl: 'https://example.com/confirm/token456',
        cityFullName: 'London, UK',
        frequency: 'hourly',
      });
    });
  });

  describe('SubscriptionConfirmedHandler', () => {
    it('should handle subscription confirmed event successfully', async () => {
      const event = new SubscriptionConfirmedEvent(
        'sub-123',
        'test@example.com',
        'Kyiv, Ukraine',
        'daily',
        'https://example.com/unsubscribe/token123',
      );

      const handler = consumer.getSubscriptionConfirmedHandler();
      await handler.handle(event);

      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledWith({
        email: event.email,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
        unsubscribeUrl: event.unsubscribeUrl,
      });
    });

    it('should propagate error when notification service fails', async () => {
      const event = new SubscriptionConfirmedEvent(
        'sub-123',
        'test@example.com',
        'Kyiv, Ukraine',
        'daily',
        'https://example.com/unsubscribe/token123',
      );
      const error = new Error('Email service failed');
      notificationServiceMock.sendSubscriptionConfirmed.mockRejectedValue(error);

      const handler = consumer.getSubscriptionConfirmedHandler();

      await expect(handler.handle(event)).rejects.toThrow('Email service failed');
    });

    it('should handle different city formats correctly', async () => {
      const event = new SubscriptionConfirmedEvent(
        'sub-789',
        'paris@example.com',
        'Paris, Île-de-France, France',
        'hourly',
        'https://example.com/unsubscribe/token789',
      );

      const handler = consumer.getSubscriptionConfirmedHandler();
      await handler.handle(event);

      expect(notificationServiceMock.sendSubscriptionConfirmed).toHaveBeenCalledWith({
        email: 'paris@example.com',
        cityFullName: 'Paris, Île-de-France, France',
        frequency: 'hourly',
        unsubscribeUrl: 'https://example.com/unsubscribe/token789',
      });
    });
  });

  describe('SubscriptionCancelledHandler', () => {
    it('should handle subscription cancelled event successfully', async () => {
      const event = new SubscriptionCancelledEvent('sub-123', 'test@example.com', 'Kyiv, Ukraine', 'daily');

      const handler = consumer.getSubscriptionCancelledHandler();
      await handler.handle(event);

      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledWith({
        email: event.email,
        cityFullName: event.cityFullName,
        frequency: event.frequency,
      });
    });

    it('should propagate error when notification service fails', async () => {
      const event = new SubscriptionCancelledEvent('sub-123', 'test@example.com', 'Kyiv, Ukraine', 'daily');
      const error = new Error('Email service failed');
      notificationServiceMock.sendSubscriptionCancellation.mockRejectedValue(error);

      const handler = consumer.getSubscriptionCancelledHandler();

      await expect(handler.handle(event)).rejects.toThrow('Email service failed');
    });

    it('should handle different email formats correctly', async () => {
      const event = new SubscriptionCancelledEvent('sub-999', 'user+weather@company.co.uk', 'Tokyo, Japan', 'hourly');

      const handler = consumer.getSubscriptionCancelledHandler();
      await handler.handle(event);

      expect(notificationServiceMock.sendSubscriptionCancellation).toHaveBeenCalledWith({
        email: 'user+weather@company.co.uk',
        cityFullName: 'Tokyo, Japan',
        frequency: 'hourly',
      });
    });
  });

  describe('Handler Factory Methods', () => {
    it('should return different handler instances', () => {
      const createdHandler1 = consumer.getSubscriptionCreatedHandler();
      const createdHandler2 = consumer.getSubscriptionCreatedHandler();
      const confirmedHandler = consumer.getSubscriptionConfirmedHandler();
      const cancelledHandler = consumer.getSubscriptionCancelledHandler();

      expect(createdHandler1).not.toBe(createdHandler2);
      expect(createdHandler1).not.toBe(confirmedHandler);
      expect(createdHandler1).not.toBe(cancelledHandler);
      expect(confirmedHandler).not.toBe(cancelledHandler);
    });

    it('should return handlers with proper constructor names', () => {
      const createdHandler = consumer.getSubscriptionCreatedHandler();
      const confirmedHandler = consumer.getSubscriptionConfirmedHandler();
      const cancelledHandler = consumer.getSubscriptionCancelledHandler();

      expect(createdHandler.constructor.name).toBe('SubscriptionCreatedHandler');
      expect(confirmedHandler.constructor.name).toBe('SubscriptionConfirmedHandler');
      expect(cancelledHandler.constructor.name).toBe('SubscriptionCancelledHandler');
    });
  });

  describe('Error Handling and Logging', () => {
    it('should handle async errors gracefully', async () => {
      const event = new SubscriptionCreatedEvent(
        'sub-error',
        'error@example.com',
        'Error City, Error Country',
        'daily',
        'https://example.com/confirm/error',
      );

      notificationServiceMock.sendSubscriptionConfirmation.mockImplementation(async () => {
        throw new Error('Async error in notification service');
      });

      const handler = consumer.getSubscriptionCreatedHandler();

      await expect(handler.handle(event)).rejects.toThrow('Async error in notification service');
    });

    it('should handle network-like errors', async () => {
      const event = new SubscriptionConfirmedEvent(
        'sub-network',
        'network@example.com',
        'Network City, Network Country',
        'hourly',
        'https://example.com/unsubscribe/network',
      );

      const networkError = new Error('Network timeout');
      networkError.name = 'NetworkError';
      notificationServiceMock.sendSubscriptionConfirmed.mockRejectedValue(networkError);

      const handler = consumer.getSubscriptionConfirmedHandler();

      await expect(handler.handle(event)).rejects.toThrow('Network timeout');
    });
  });
});
