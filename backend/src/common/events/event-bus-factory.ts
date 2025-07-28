import logger from '../logging/logger';
import { InMemoryEventBus } from './implementations/in-memory-event-bus';
import { RedpandaEventBus } from './implementations/redpanda-event-bus';
import { IEventBus } from './interfaces/event-bus.interface';
import { DEFAULT_REDPANDA_CONFIG, EventBusConfig } from './types/event-bus-config';

/**
 * Factory for creating event bus instances based on configuration
 */
export class EventBusFactory {
  /**
   * Creates an event bus instance based on the provided configuration
   */
  static create(config: EventBusConfig): IEventBus {
    logger.info('Creating EventBus', { provider: config.provider });

    switch (config.provider) {
      case 'in-memory':
        return new InMemoryEventBus();

      case 'redpanda':
        if (!config.redpanda) {
          throw new Error('Redpanda configuration is required when using Redpanda provider');
        }

        // Merge with defaults
        const redpandaConfig = {
          ...DEFAULT_REDPANDA_CONFIG,
          ...config.redpanda,
        };

        // Validate required fields
        if (!redpandaConfig.brokers?.length) {
          throw new Error('Redpanda brokers configuration is required');
        }
        if (!redpandaConfig.clientId) {
          throw new Error('Redpanda clientId is required');
        }
        if (!redpandaConfig.groupId) {
          throw new Error('Redpanda groupId is required');
        }

        return new RedpandaEventBus(redpandaConfig);

      default:
        throw new Error(`Unsupported event bus provider: ${config.provider}`);
    }
  }

  /**
   * Validates event bus configuration
   */
  static validateConfig(config: EventBusConfig): void {
    if (!config.provider) {
      throw new Error('EventBus provider is required');
    }

    if (config.provider === 'redpanda') {
      if (!config.redpanda) {
        throw new Error('Redpanda configuration is required when using Redpanda provider');
      }

      const { brokers, clientId, groupId } = config.redpanda;

      if (!brokers?.length) {
        throw new Error('Redpanda brokers must be a non-empty array');
      }

      if (!clientId?.trim()) {
        throw new Error('Redpanda clientId must be a non-empty string');
      }

      if (!groupId?.trim()) {
        throw new Error('Redpanda groupId must be a non-empty string');
      }
    }
  }
}
