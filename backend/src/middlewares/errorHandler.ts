import { type Request, type Response, type NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * Catches all errors thrown in routes/controllers and returns a consistent JSON response.
 */
export const errorHandler = (
  err: Error & { statusCode?: number; code?: string | number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${statusCode}] ${message}`, err.stack);

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: env.NODE_ENV === 'development' ? message : 'Invalid input data.',
    });
    return;
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000 || err.code === '11000') {
    res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: 'A record with this data already exists.',
    });
    return;
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'The provided ID is not valid.',
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
