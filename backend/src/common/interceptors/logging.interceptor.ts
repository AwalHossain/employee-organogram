import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable, tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext('LoggingInterceptor');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, params, query } = request;
        const requestId = uuidv4();

        // Add requestId to request so it can be used in controllers/services
        request.requestId = requestId;

        // Log the request
        this.logger.info({
            requestId,
            type: 'REQUEST',
            method,
            url,
            body,
            params,
            query,
        });

        const now = Date.now();
        return next.handle().pipe(
            tap({
                next: (data) => {
                    // Log successful response
                    this.logger.info({
                        requestId,
                        type: 'RESPONSE',
                        responseTime: `${Date.now() - now}ms`,
                        status: context.switchToHttp().getResponse().statusCode,
                    });
                },
                error: (error) => {
                    // Log error response
                    this.logger.error({
                        requestId,
                        type: 'ERROR',
                        responseTime: `${Date.now() - now}ms`,
                        status: error.status || 500,
                        message: error.message,
                        stack: error.stack,
                    });
                },
            }),
        );
    }
} 