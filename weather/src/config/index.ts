import { config as dotEnvConfig } from 'dotenv';
dotEnvConfig();

import { ConfigFactory, type Config } from './config-factory';

/**
 * Default configuration instance created from environment variables
 */
const config = ConfigFactory.createFromEnv();

export default config;
export { ConfigFactory, configSchema } from './config-factory';
export type { Config };
