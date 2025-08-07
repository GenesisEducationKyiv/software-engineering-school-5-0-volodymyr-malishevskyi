import { ConfigFactory, type Config } from '@/config/config-factory';

/**
 * Test configuration for unit and integration tests
 */
const config = ConfigFactory.createTestConfig();

export default config;
export type { Config };
