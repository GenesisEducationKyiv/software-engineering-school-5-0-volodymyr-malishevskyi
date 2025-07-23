import { NextFunction, Request, Response } from 'express';
import logger from '../services/logger';

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log incoming request
  logger.http(`${req.method} ${req.url}`, {
    type: 'http',
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.http(`${req.method} ${req.url} - ${res.statusCode}`, {
      type: 'http',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
};

export default requestLoggingMiddleware;
