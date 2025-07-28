import { EventEmitter } from 'events';
import { injectable } from 'tsyringe';
import logger from '../../logging/logger';
import { BaseEvent } from '../base-event';
import { EventHandler } from '../types/event-handler';
import { IEventBus } from '../interfaces/event-bus.interface';

/**
 * In-memory event bus implementation using Node.js EventEmitter
 * Best for development, testing, and single-instance deployments
 */
@injectable()
export class InMemoryEventBus extends EventEmitter implements IEventBus {
  private handlers = new Map<string, EventHandler[]>();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  async publish(event: BaseEvent): Promise<void> {
    logger.info('Publishing event', {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      timestamp: event.timestamp,
    });

    const handlers = this.handlers.get(event.eventType) || [];

    if (handlers.length === 0) {
      logger.warn('No handlers found for event type', { eventType: event.eventType });
      return;
    }

    const promises = handlers.map(async (handler) => {
      try {
        await handler.handle(event);
        logger.debug('Event handled successfully', {
          eventId: event.eventId,
          eventType: event.eventType,
          handler: handler.constructor.name,
        });
      } catch (error) {
        logger.error('Event handler failed', {
          eventId: event.eventId,
          eventType: event.eventType,
          handler: handler.constructor.name,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    });

    await Promise.all(promises);
  }

  subscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    logger.info('Event handler registered', {
      eventType,
      handler: handler.constructor.name,
      totalHandlers: handlers.length,
    });
  }

  unsubscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler as EventHandler);

    if (index > -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);

      logger.info('Event handler unregistered', {
        eventType,
        handler: handler.constructor.name,
        remainingHandlers: handlers.length,
      });
    }
  }

  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  async shutdown(): Promise<void> {
    this.removeAllListeners();
    this.handlers.clear();
    logger.info('InMemoryEventBus shut down successfully');
  }
}
