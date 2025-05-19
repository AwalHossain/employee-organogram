import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            singleLine: true,
          },
        },
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        customProps: () => ({
          context: 'HTTP',
        }),
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100, // Limit each IP to 100 requests per minute
      },
    ]),
    DatabaseModule,
    RedisModule,
    EmployeesModule,
    AuthModule,
    TerminusModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }
