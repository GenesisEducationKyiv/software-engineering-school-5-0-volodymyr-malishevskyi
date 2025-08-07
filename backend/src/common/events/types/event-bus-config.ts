/**
 * Event bus provider types
 */
export type EventBusProvider = 'in-memory' | 'redpanda';

/**
 * Redpanda specific configuration
 */
export interface RedpandaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  topic: string;
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    retries: number;
    initialRetryTime: number;
    maxRetryTime: number;
  };
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  provider: EventBusProvider;
  redpanda?: RedpandaConfig;
}

/**
 * Default event bus configurations
 */
export const DEFAULT_EVENT_BUS_CONFIG: EventBusConfig = {
  provider: 'in-memory',
};

export const DEFAULT_REDPANDA_CONFIG: Partial<RedpandaConfig> = {
  topic: 'weather-events',
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    retries: 5,
    initialRetryTime: 100,
    maxRetryTime: 30000,
  },
};
