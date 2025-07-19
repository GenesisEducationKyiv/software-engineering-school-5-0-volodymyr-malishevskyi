import config from '@/config';
import { NextFunction, Request, Response } from 'express';
import { HTTPClientError } from '../errors/http-error';
import { BaseError } from '../errors/base';
import logger from '../logging/logger';

const errorHandleMiddleware = (
  err: Error,
  req: Request,
  res: Response, // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  // Handle HTTP-specific errors (presentation layer)
  if (err instanceof HTTPClientError) {
    logger.http(`${req.url} ${err.name}: ${err.message}`, {
      type: 'http',
      url: req.url,
      method: req.method,
      statusCode: err.statusCode,
      errorName: err.name,
      errorMessage: err.message,
    });
    res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Handle structured application errors (domain/infrastructure/application)
  if (err instanceof BaseError) {
    const metadata = err.getMetadata();

    logger.error(`${req.url} ${err.name}: ${err.message}`, {
      type: err.type,
      url: req.url,
      method: req.method,
      errorName: err.name,
      errorMessage: err.message,
      errorCode: err.code,
      correlationId: metadata.correlationId,
      timestamp: metadata.timestamp,
      context: metadata.context,
      stack: err.stack,
    });

    // Security-aware error responses - don't expose internal details
    const isDevelopment = config.nodeEnv === 'development';
    res.status(500).json({
      code: 500,
      message: 'Internal Server Error',
      correlationId: metadata.correlationId,
      ...(isDevelopment && {
        error: err.message,
        errorCode: err.code,
        context: metadata.context,
      }),
    });
    return;
  }

  // Handle unknown/unexpected errors
  logger.error(`${req.url} Unexpected error: ${err.message}`, {
    type: 'system',
    url: req.url,
    method: req.method,
    errorName: err.name,
    errorMessage: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
    error: config.nodeEnv === 'development' ? err.message : undefined,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });
};

export default errorHandleMiddleware;
