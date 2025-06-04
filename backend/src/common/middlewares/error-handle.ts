import config from '@/config';
import { NextFunction, Request, Response } from 'express';
import { HTTPClientError } from '../errors/http-error';

const errorHandleMiddleware = (
  err: Error,
  req: Request,
  res: Response, // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  if (err instanceof HTTPClientError) {
    console.log(`${new Date().toISOString()} ${req.url} ${err.name}: ${err.message}`);
    res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
    });
  } else {
    console.error(`${new Date().toISOString()} ${req.url} ${err.name}: ${err.message}`);
    console.error(err.stack);
    res.status(500).json({
      code: 500,
      message: 'Internal Server Error',
      error: config.nodeEnv ? err.message : undefined,
      stack: config.nodeEnv ? err.stack : undefined,
    });
  }
};

export default errorHandleMiddleware;
