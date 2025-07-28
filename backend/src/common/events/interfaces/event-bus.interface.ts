import { BaseEvent } from '../base-event';
import { EventHandler } from '../types/event-handler';

/**
 * Event bus interface for publishing and subscribing to events
 */
export interface IEventBus {
  /**
   * Publishes an event to all registered handlers
   */
  publish(event: BaseEvent): Promise<void>;

  /**
   * Subscribes a handler to events of a specific type
   */
  subscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void;

  /**
   * Unsubscribes a handler from events of a specific type
   */
  unsubscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void;

  /**
   * Gets the number of handlers for a specific event type
   */
  getHandlerCount(eventType: string): number;

  /**
   * Gracefully shuts down the event bus
   */
  shutdown?(): Promise<void>;
}
