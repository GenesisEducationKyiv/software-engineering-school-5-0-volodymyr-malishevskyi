import config from '@/config';
import { NextFunction, Request, Response } from 'express';
import { HTTPClientError } from '../errors/http-error';
import logger from '../services/logger';

const errorHandleMiddleware = (
  err: Error,
  req: Request,
  res: Response, // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
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
  } else {
    logger.error(`${req.url} ${err.name}: ${err.message}`, {
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
      error: config.nodeEnv ? err.message : undefined,
      stack: config.nodeEnv ? err.stack : undefined,
    });
  }
};

export default errorHandleMiddleware;
