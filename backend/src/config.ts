import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { ConfigFactory, type Config } from './config/config-factory';

/**
 * Default configuration instance created from environment variables
 * In test environment, use test configuration
 */
const config = process.env.NODE_ENV === 'test' ? ConfigFactory.createTestConfig() : ConfigFactory.createFromEnv();

export default config;
export { ConfigFactory } from './config/config-factory';
export type { Config };
