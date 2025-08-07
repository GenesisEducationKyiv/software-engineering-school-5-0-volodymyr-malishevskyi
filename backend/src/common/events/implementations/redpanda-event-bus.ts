import { Kafka, Consumer, Producer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import { injectable } from 'tsyringe';
import logger from '../../logging/logger';
import { BaseEvent } from '../base-event';
import { EventHandler } from '../types/event-handler';
import { IEventBus } from '../interfaces/event-bus.interface';
import { RedpandaConfig } from '../types/event-bus-config';

/**
 * Serialized event structure for Kafka messages
 */
interface SerializedEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

/**
 * Redpanda/Kafka event bus implementation
 * Best for production, distributed deployments with guaranteed delivery
 */
@injectable()
export class RedpandaEventBus implements IEventBus {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private handlers = new Map<string, EventHandler[]>();
  private isProducerConnected = false;
  private isConsumerConnected = false;
  private isShuttingDown = false;

  constructor(private config: RedpandaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      connectionTimeout: config.connectionTimeout || 3000,
      requestTimeout: config.requestTimeout || 30000,
      retry: config.retry || {
        retries: 5,
        initialRetryTime: 100,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.producer.on('producer.disconnect', () => {
      logger.warn('Kafka producer disconnected');
      this.isProducerConnected = false;
    });

    this.consumer.on('consumer.disconnect', () => {
      logger.warn('Kafka consumer disconnected');
      this.isConsumerConnected = false;
    });
  }

  async publish(event: BaseEvent): Promise<void> {
    await this.ensureProducerConnected();

    const serializedEvent: SerializedEvent = {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      timestamp: event.timestamp.toISOString(),
      payload: this.extractEventPayload(event),
    };

    try {
      const message = {
        key: event.eventType, // Partition by event type for ordered processing
        value: JSON.stringify(serializedEvent),
        headers: {
          eventId: event.eventId,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
        },
      };

      await this.producer.send({
        topic: this.config.topic,
        messages: [message],
      });

      logger.info('Event published to Kafka', {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        topic: this.config.topic,
      });
    } catch (error) {
      logger.error('Failed to publish event to Kafka', {
        eventId: event.eventId,
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  subscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);

    logger.info('Event handler registered for Kafka consumer', {
      eventType,
      handler: handler.constructor.name,
      totalHandlers: handlers.length,
    });

    // Start consuming if this is the first handler
    if (this.handlers.size === 1 && !this.isConsumerConnected) {
      this.startConsuming().catch((error) => {
        logger.error('Failed to start Kafka consumer', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }

  unsubscribe<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler as EventHandler);

    if (index > -1) {
      handlers.splice(index, 1);
      if (handlers.length === 0) {
        this.handlers.delete(eventType);
      } else {
        this.handlers.set(eventType, handlers);
      }

      logger.info('Event handler unregistered from Kafka consumer', {
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
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down Redpanda EventBus');

    try {
      if (this.isConsumerConnected) {
        await this.consumer.stop();
        await this.consumer.disconnect();
        this.isConsumerConnected = false;
      }

      if (this.isProducerConnected) {
        await this.producer.disconnect();
        this.isProducerConnected = false;
      }

      this.handlers.clear();
      logger.info('Redpanda EventBus shut down successfully');
    } catch (error) {
      logger.error('Error during Redpanda EventBus shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async ensureProducerConnected(): Promise<void> {
    if (this.isProducerConnected || this.isShuttingDown) {
      return;
    }

    try {
      await this.producer.connect();
      this.isProducerConnected = true;
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka producer', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async startConsuming(): Promise<void> {
    if (this.isConsumerConnected || this.isShuttingDown) {
      return;
    }

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: this.config.topic,
        fromBeginning: false, // Only consume new messages
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      this.isConsumerConnected = true;
      logger.info('Kafka consumer started successfully', {
        topic: this.config.topic,
        groupId: this.config.groupId,
      });
    } catch (error) {
      logger.error('Failed to start Kafka consumer', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    try {
      const serializedEvent = this.deserializeMessage(message);
      const event = this.reconstructEvent(serializedEvent);
      const handlers = this.handlers.get(event.eventType) || [];

      if (handlers.length === 0) {
        logger.warn('No handlers found for event type from Kafka', {
          eventType: event.eventType,
          eventId: event.eventId,
        });
        return;
      }

      // Process handlers concurrently
      const promises = handlers.map(async (handler) => {
        try {
          await handler.handle(event);
          logger.debug('Kafka event handled successfully', {
            eventId: event.eventId,
            eventType: event.eventType,
            handler: handler.constructor.name,
          });
        } catch (error) {
          logger.error('Kafka event handler failed', {
            eventId: event.eventId,
            eventType: event.eventType,
            handler: handler.constructor.name,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Don't throw here to avoid crashing the consumer
          // In production, you might want to send to a dead letter queue
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Failed to process Kafka message', {
        error: error instanceof Error ? error.message : String(error),
        offset: message.offset,
        partition: payload.partition,
      });
    }
  }

  private deserializeMessage(message: KafkaMessage): SerializedEvent {
    if (!message.value) {
      throw new Error('Message value is null or undefined');
    }

    const messageValue = message.value.toString();
    return JSON.parse(messageValue) as SerializedEvent;
  }

  private reconstructEvent(serializedEvent: SerializedEvent): BaseEvent {
    // Reconstruct the BaseEvent from serialized data - create plain object with BaseEvent properties
    const event = {
      eventId: serializedEvent.eventId,
      eventType: serializedEvent.eventType,
      aggregateId: serializedEvent.aggregateId,
      timestamp: new Date(serializedEvent.timestamp),
      // Merge payload properties into the event object
      ...serializedEvent.payload,
    } as BaseEvent;

    return event;
  }

  private extractEventPayload(event: BaseEvent): Record<string, unknown> {
    // Extract all properties except the base event properties
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { eventId, eventType, aggregateId, timestamp, ...payload } = event as unknown as Record<string, unknown>;
    return payload;
  }
}
