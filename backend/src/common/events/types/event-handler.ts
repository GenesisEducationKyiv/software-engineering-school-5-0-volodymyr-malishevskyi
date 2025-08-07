import { BaseEvent } from '../base-event';

/**
 * Interface for event handlers
 * Handlers are responsible for processing specific event types
 */
export interface EventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T): Promise<void>;
}
