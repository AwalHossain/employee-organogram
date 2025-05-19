import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    constructor(
        private readonly logger: PinoLogger,
        private readonly redisService: RedisService,
    ) {
        super();
        this.logger.setContext('RedisHealthIndicator');
    }

    async check(key: string): Promise<HealthIndicatorResult> {
        try {
            const startTime = Date.now();

            // Test Redis connection with ping
            const client = this.redisService.getClient();
            await client?.ping();

            // Test Redis operations
            const testKey = `health:${Date.now()}`;
            await this.redisService.set(testKey, 'redis-check');
            const result = await this.redisService.get<string>(testKey);
            await this.redisService.del(testKey);

            if (result !== 'redis-check') {
                throw new Error('Redis validation failed - values do not match');
            }

            const responseTime = Date.now() - startTime;

            return this.getStatus(key, true, {
                responseTime: `${responseTime}ms`,
                connection: 'Upstash Redis'
            });
        } catch (error) {
            this.logger.error({
                action: 'redis_health_check',
                status: 'failed',
                error: error.message
            });

            throw new HealthCheckError(
                'Redis health check failed',
                this.getStatus(key, false, { message: error.message })
            );
        }
    }
} 