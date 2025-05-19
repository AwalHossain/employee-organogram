import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext('HttpExceptionFilter');
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : 'Internal server error';

        const responseBody = {
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId: request.requestId,
        };

        // Log the exception with context
        this.logger.error({
            exception,
            request: {
                url: request.url,
                method: request.method,
                body: request.body,
                params: request.params,
                query: request.query,
            },
            status,
            requestId: request.requestId,
        });

        response.status(status).json(responseBody);
    }
} 