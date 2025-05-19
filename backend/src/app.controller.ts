import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { RedisService } from './redis/redis.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('redis-test')
  @ApiOperation({ summary: 'Test if Redis is working' })
  @ApiResponse({ status: 200, description: 'Redis connection status' })
  async testRedis() {
    const testKey = `test:${Date.now()}`;
    const testValue = { value: 'Redis Test', timestamp: new Date().toISOString() };

    try {
      // Test Redis operations
      await this.redisService.set(testKey, testValue);
      const result = await this.redisService.get(testKey);
      await this.redisService.del(testKey);

      const cacheStatus = await this.redisService.getStatus();

      return {
        success: true,
        cacheType: cacheStatus.cacheType,
        isRedisConnected: cacheStatus.isRedisConnected,
        original: testValue,
        fromCache: result,
        match: JSON.stringify(testValue) === JSON.stringify(result),
        message: 'Cache test successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Cache test failed',
      };
    }
  }

  @Get('cache-status')
  @ApiOperation({ summary: 'Show cache status information' })
  @ApiResponse({ status: 200, description: 'Cache status information' })
  async getCacheStatus() {
    return this.redisService.getStatus();
  }
}
