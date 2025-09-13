import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = err;

  logger.error({
    error: {
      message: err.message,
      stack: err.stack,
      statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 ? "Internal server error" : message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
      }),
    },
  });
};

export const createError = (message: string, statusCode = 500): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};
