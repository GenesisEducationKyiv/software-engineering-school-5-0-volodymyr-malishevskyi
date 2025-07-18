import winston from 'winston';

interface LoggerConfig {
  nodeEnv: string;
  level: string;
  directory: string;
  maxFileSize: number;
  maxFiles: number;
}

function getLoggerConfig(): LoggerConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    directory: process.env.LOG_DIRECTORY || 'logs',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '5242880', 10),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  };
}

const loggerConfig = getLoggerConfig();

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [];

// Setup transport for development
if (loggerConfig.nodeEnv === 'development') {
  // Use a more detailed console format in development
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  );
} else {
  // Simpler console format for production
  transports.push(
    new winston.transports.Console({
      format: fileFormat,
      level: 'info',
    }),
  );
}

// File transports for both development and production
transports.push(
  // Error log file
  new winston.transports.File({
    filename: `${loggerConfig.directory}/error.log`,
    level: 'error',
    format: fileFormat,
    maxsize: loggerConfig.maxFileSize,
    maxFiles: loggerConfig.maxFiles,
  }),
  // Combined log file
  new winston.transports.File({
    filename: `${loggerConfig.directory}/combined.log`,
    format: fileFormat,
    maxsize: loggerConfig.maxFileSize,
    maxFiles: loggerConfig.maxFiles,
  }),
);

const logger = winston.createLogger({
  level: loggerConfig.level,
  format: fileFormat,
  transports,
  exitOnError: false,
});

export default logger;
