import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    LoggerModule,
    RedisModule,
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator]
})
export class HealthModule { } 