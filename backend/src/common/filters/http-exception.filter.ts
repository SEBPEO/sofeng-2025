import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message || message,
    };

    // Log error for debugging
    if (status >= 500) {
      this.logger.error(`Error ${status} on ${request.method} ${request.url}`, exception);
    } else {
      this.logger.warn(`Error ${status} on ${request.method} ${request.url}: ${errorResponse.message}`);
    }

    // Ensure we always return JSON
    response.setHeader('Content-Type', 'application/json');
    response.status(status).json(errorResponse);
  }
}
